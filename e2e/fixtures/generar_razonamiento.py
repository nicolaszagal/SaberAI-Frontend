"""Genera las respuestas de GET /revisiones/{id}/razonamiento que usan las pruebas E2E (F-035).

Las respuestas salen del código real del Fog (`detectar_eventos`, `ventana_atencion`,
`construir_razonamiento`, `filas_de_razonamiento`, `ConsultarRazonamiento` y
`RazonamientoResponse`) con los parámetros U1 a U6 vigentes. Solo la base de datos se
sustituye por filas fijas. Los frases y el estado los decide el Fog; nada se escribe a mano.

Las curvas de ángulo de codo de `respaldada`, `discordante`, `no_concluyente` y `censurado` son
rampas armadas para provocar cada estado (el `.npz` real de la Validación 1 solo da
`insuficiente`, que se genera con su ángulo real de `pose_real.json`). Comparten fps, frame del
tocado (20) y largo (40) con `pose_real.json`.

Fixtures: razonamiento_{respaldada,discordante,no_concluyente,insuficiente,censurado,
no_registrado,no_calculado,no_disponible}.json

Uso (desde la raíz del repo backend, con su venv activo):
  python ../SaberAISoftware/e2e/fixtures/generar_razonamiento.py
"""
import asyncio
import json
import sys
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

sys.path.insert(0, str(Path.cwd()))

from fog.application.consultar_razonamiento import ConsultarRazonamiento  # noqa: E402
from fog.domain.audit_models import DatosRazonamiento  # noqa: E402
from fog.domain.razonamiento import (  # noqa: E402
    PoseEventos, construir_razonamiento, detectar_eventos, fila_no_calculado,
    filas_de_razonamiento, ventana_atencion,
)
from fog.infrastructure.api.schemas import RazonamientoResponse  # noqa: E402
from fog.infrastructure.explicacion.parametros_json import ParametrosExplicacionJson  # noqa: E402

SALIDA = Path(__file__).resolve().parent
REVISION_ID = uuid.UUID("44444444-4444-4444-8444-444444444444")
CLASIF_ID = uuid.UUID("55555555-5555-4555-8555-555555555555")
FPS = 30.0
TOCADO = 20
N = 40


def rampa(inicio: int, base: float = 100.0, paso: float = 12.0) -> list[float]:
    """Ángulo plano hasta `inicio` y luego una subida sostenida que pasa de 135° antes del tocado."""
    return [base if t < inicio else min(base + paso * (t - inicio + 1), 175.0) for t in range(N)]


def atencion_en(centro: int, ancho: int = 3) -> list[float]:
    """Pesos de atención concentrados alrededor de `centro`, normalizados a 1."""
    w = [1.0 + (10.0 if abs(t - centro) <= ancho else 0.0) for t in range(N)]
    s = sum(w)
    return [x / s for x in w]


class _Consulta:
    def __init__(self, datos: DatosRazonamiento):
        self._datos = datos

    async def datos_razonamiento(self, revision_id):
        return self._datos


class _Uow:
    def __init__(self, filas):
        self._filas = filas

    @asynccontextmanager
    async def transaccion(self):
        filas = self._filas

        class _Repo:
            async def listar(self, clasificacion_id):
                return filas

        class _Tx:
            razonamientos = _Repo()

        yield _Tx()


async def servir(datos: DatosRazonamiento, filas, nombre: str) -> None:
    v = await ConsultarRazonamiento(_Consulta(datos), _Uow(filas)).execute(REVISION_ID)
    resp = RazonamientoResponse(
        revision_id=v.revision_id, estado=v.estado, frases=v.frases,
        criterio_fie={"articulo": v.articulo, "clase": v.clase} if v.articulo is not None else None,
        confianza=v.confianza,
        ventana_atencion=None if v.ventana_atencion is None
        else {k: v.ventana_atencion[k] for k in ("desde_ms", "hasta_ms")},
        frame_clave=v.frame_clave,
        eventos=[
            {"tipo": e.tipo, "tirador": e.tirador, "frame_idx": e.frame_idx, "t_ms": e.t_ms,
             "censurado_inicio": (e.detalle or {}).get("censurado_inicio")}
            for e in v.eventos
        ],
        params_version=v.params_version, motivo=v.motivo,
    )
    cuerpo = resp.model_dump(mode="json", exclude_none=True)
    (SALIDA / nombre).write_text(json.dumps(cuerpo, ensure_ascii=False, indent=1))
    print(nombre, cuerpo["estado"], cuerpo.get("frases"))


async def desde_pose(params, nombre, clase, ang_a, ang_b, cierre, atencion, confianza):
    eventos = detectar_eventos(PoseEventos(0, {"A": ang_a, "B": ang_b}, cierre), FPS, TOCADO, params)
    ventana = ventana_atencion(atencion, list(range(N)), FPS, TOCADO, params) if atencion else None
    r = construir_razonamiento(clase, eventos, ventana, params)
    datos = DatosRazonamiento(REVISION_ID, CLASIF_ID, True, None, clase, confianza)
    await servir(datos, filas_de_razonamiento(r, params.version), nombre)


async def main() -> None:
    params = ParametrosExplicacionJson().cargar()
    cierre = [0.0 if t < 6 else 0.02 for t in range(N)]  # acercamiento desde el frame 6
    real = json.loads((SALIDA / "pose_real.json").read_text())
    real_a = real["tiradores"]["A"]["angulo_codo"]
    real_b = real["tiradores"]["B"]["angulo_codo"]

    # A extiende en el frame 8 y B en el 12: ROJ antes que VER.
    a, b = rampa(8), rampa(12)
    await desde_pose(params, "razonamiento_respaldada.json", "AttackA", a, b, cierre, atencion_en(14), 0.74)
    await desde_pose(params, "razonamiento_discordante.json", "AttackB", a, b, cierre, atencion_en(14), 0.81)
    await desde_pose(params, "razonamiento_no_concluyente.json", "AttackA", rampa(10), rampa(10), cierre, atencion_en(14), 0.66)
    await desde_pose(params, "razonamiento_insuficiente.json", "AttackA", real_a, real_b, None, None, 0.58)
    # A ya tenía el brazo extendido al comienzo del clip (censurado); B empieza en el frame 10.
    cens = [160.0] * N
    await desde_pose(params, "razonamiento_censurado.json", "AttackA", cens, rampa(10), [0.02] * N, atencion_en(12), 0.77)

    sin_filas = DatosRazonamiento(REVISION_ID, CLASIF_ID, True, None, "AttackA", 0.9)
    await servir(sin_filas, [], "razonamiento_no_registrado.json")
    await servir(sin_filas, [fila_no_calculado(params.version)], "razonamiento_no_calculado.json")
    no_disp = DatosRazonamiento(REVISION_ID, CLASIF_ID, False, "pose_incompleta", None, None)
    await servir(no_disp, [], "razonamiento_no_disponible.json")


asyncio.run(main())
