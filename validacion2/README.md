# Código aparcado para la Validación 2

Pantallas y componentes que **no forman parte de la navegación de la Validación 1**
(Inicio, Revisión VAR, Historial y Configuración del combate). Se conservan sin borrar,
pero quedan fuera de `src/` y de `tsc`.

| Archivo | Motivo |
|---|---|
| `screens/CamerasScreen.tsx`, `components/CameraCard.tsx`, `components/CalibrationModal.tsx`, `components/SystemStatusPanel.tsx` | Estado y calibración de cámaras (F-010, RF-25): dependen de la captura en tiempo real (Validación 2) |
| `screens/TournamentScreen.tsx` | Torneo y exportación PDF (F-009, D-10): fuera de alcance |
| `components/VideoScrubber.tsx` | Avance fotograma a fotograma (F-007, RF-16): Validación 2 |
| `data/datos_simulados.ts` | Datos inventados que usaban estas pantallas |

Para reactivarlos: moverlos de vuelta a `src/`, corregir las rutas de importación y
**reemplazar `datos_simulados.ts` por fuentes reales** (regla 8 de CLAUDE.md: no se muestran
datos simulados en pantallas).
