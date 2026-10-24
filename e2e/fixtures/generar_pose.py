"""Genera las respuestas de GET /revisiones/{id}/pose que usan las pruebas E2E (F-031).

Las respuestas salen del código real del Fog (`ConsultarPose` + `PoseResponse` +
`LocalFileStorage`) sobre un `.npz` real de la Validación 1; nada se escribe a mano.
Solo la capa de base de datos se sustituye por datos fijos, porque no hay PostgreSQL con
las revisiones: `fps` y `frame_tocado` son parámetros de este script (el `.npz` no los guarda).

Fixtures:
  pose_real.json          el `.npz` completo (`frame_inicio` 0). B sin detectar en dos frames.
  pose_frame_inicio.json  el mismo `.npz` sin sus 8 primeros frames, como si Fog hubiera fijado
                          las identidades en el frame 8 (`frame_inicio` 8). Hoy los 97 `.npz`
                          reales tienen `lock_frame` 0: sin este caso el desfase no se probaría.
  pose_sin_trazos.json    `.npz` vacío (timeout): `n_frames` 0 y `motivo`.

Uso (desde la raíz del repo backend, con su venv activo):
  python ../SaberAISoftware/e2e/fixtures/generar_pose.py [ruta_al_npz]
"""
import asyncio
import json
import sys
import tempfile
import uuid
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path.cwd()))

from fog.application.consultar_pose import ConsultarPose  # noqa: E402
from fog.domain.audit_models import DatosPose  # noqa: E402
from fog.infrastructure.api.schemas import PoseResponse  # noqa: E402
from fog.infrastructure.storage.local_file_storage import LocalFileStorage  # noqa: E402

NPZ_REAL = Path("datos/storage/keypoints/0d/0dbe80177adbb73d4aa8b4513a19a0a350d6520dca16ed58b0c6c93682569226.npz")
SALIDA = Path(__file__).resolve().parent
REVISION_ID = uuid.UUID("44444444-4444-4444-8444-444444444444")
FPS = 30.0
FRAME_TOCADO = 20
RECORTE = 8


class _Consulta:
    def __init__(self, datos: DatosPose):
        self._datos = datos

    async def datos_pose(self, revision_id):
        return self._datos


async def generar(arrays: dict, nombre: str, motivo: str | None = None) -> None:
    with tempfile.TemporaryDirectory() as raiz:
        storage = LocalFileStorage(raiz)
        uri, sha = await storage.save_keypoints(arrays)
        datos = DatosPose(
            revision_id=REVISION_ID, fps=FPS, frame_tocado=FRAME_TOCADO,
            brazo_a="diestro", brazo_b="zurdo", disponible=motivo is None,
            motivo_no_disp=motivo, keypoints_uri=uri, keypoints_sha256=sha,
        )
        vista = await ConsultarPose(_Consulta(datos), storage).execute(REVISION_ID)
    resp = PoseResponse(
        **{k: v for k, v in vars(vista).items() if k != "tiradores"},
        tiradores=None if vista.tiradores is None
        else {lado: vars(t) for lado, t in vista.tiradores.items()},
    )
    (SALIDA / nombre).write_text(json.dumps(resp.model_dump(mode="json"), separators=(",", ":")))
    print(nombre, "n_frames", vista.n_frames, "frame_inicio", vista.frame_inicio)


async def main() -> None:
    ruta = Path(sys.argv[1]) if len(sys.argv) > 1 else NPZ_REAL
    with np.load(ruta, allow_pickle=False) as z:
        real = {k: z[k] for k in z.files}
    await generar(real, "pose_real.json")

    por_frame = [k for k in real if real[k].ndim >= 1 and real[k].shape[0] == real["a_xy"].shape[0]]
    recortado = {k: (v[RECORTE:] if k in por_frame else v) for k, v in real.items()}
    recortado["lock_frame"] = np.array(RECORTE, dtype=np.int64)
    await generar(recortado, "pose_frame_inicio.json")

    vacio = {k: (v[:0] if k in por_frame else v) for k, v in real.items()}
    await generar(vacio, "pose_sin_trazos.json", motivo="pose_incompleta")


asyncio.run(main())
