# Plataforma Empresarial SaaS de Inspecciones y Cargue - Walkthrough

La plataforma web corporativa de gestión de inspecciones, cargue, evidencias fotográficas, checklists dinámicos y generación automática de informes PDF ha sido construida y desplegada en **localhost**.

---

## 1. URLs de Acceso Localhost

| Servicio | URL | Descripción |
| :--- | :--- | :--- |
| **Plataforma Unificada Única (Localhost)** | [http://localhost:4000](http://localhost:4000) | **Un solo localhost** para la aplicación web completa, API REST y reportes |
| **Repositorio GitHub Conectado** | [https://github.com/banqi-lgtm/china](https://github.com/banqi-lgtm/china) | Repositorio oficial conectado y sincronizado con la rama `main` |

---

## 2. Credenciales y Cuentas Demo por Rol

En la pantalla de inicio de sesión dispones de **botones de acceso rápido (1 clic)** para cada rol, o puedes ingresar manualmente:

| Rol | Correo | Contraseña | Capacidades Clave |
| :--- | :--- | :--- | :--- |
| **CONSULTOR (Mateo)** | `mateo@inspectionpro.com` | `mateo123` | Bandeja de supervisión ("Pendientes de revisión", "En corrección", "Aprobadas"), revisión de evidencias, solicitud de corrección al operario, aprobación técnica y generación de informes PDF oficiales. |
| **OPERARIO / EMPLEADO** | `operario@inspectionpro.com` | `operario123` | Experiencia móvil ("Mobile-First"), captura de geolocalización GPS, wizard paso a paso de 10 etapas, checklist dinámico, cámara/subida de fotos por categorías, rotación, firma digital táctil y guardado automático. |
| **CLIENTE / EMPRESA** | `cliente@demologistics.com` | `cliente123` | Aislamiento estricto de datos (solo ve su empresa: *TransLogix Global*), consulta de estados, inspección de fotos en alta resolución, trazabilidad y descarga de informes PDF oficiales. |
| **SUPER ADMIN** | `admin@inspectionpro.com` | `admin123` | Control total del sistema: gestión de empresas, usuarios, diseñador de checklists dinámicos (categorías y preguntas), auditoría global (Audit Logs) y configuración. |

> [!TIP]
> En la barra superior de navegación existe un **Role Switcher** interactivo que permite alternar instantáneamente entre los 4 roles sin tener que cerrar sesión.

---

## 3. Módulos y Flujos Implementados

### A. Wizard de Inspección en 10 Pasos (Mobile-First)
1. **Información General**: Selección de empresa, operario, consultor y captura de coordenadas GPS en vivo con un botón.
2. **Datos del Contenedor**: Número de contenedor (`MSKU-xxxx`), tipo, tamaño, transportador, placa del cabezote y precinto aduanero.
3. **Cantidad y Carga**: Unidades, peso bruto, peso neto, volumen en CBM y tipo de embalaje (tarimas, cajas, tambores).
4. **Checklist Dinámico de Condiciones**: Preguntas interactivas `✓ OK`, `✕ NO OK` y `N/A`. Al presionar **NO OK**, se despliega automáticamente el campo de **Hallazgo Obligatorio** con severidad (`BAJA`, `MEDIA`, `ALTA`, `CRÍTICA`) y requerimiento de foto.
5. **Proceso de Cargue**: Horarios de inicio/fin, personal involucrado, maquinaria (montacargas) y condiciones ambientales.
6. **Gestor de Evidencias Multimedia**: Galerías categorizadas (*Contenedor, Cargue, Producto, Vehículo, Daños, Documentación, Otras*), soporte para cámara de celular (`capture="environment"`), rotación de imágenes a 90°, marcado de foto principal y leyendas descriptivas.
7. **Detalles del Producto**: Nombre, referencia, marca, lote de fabricación y estado de calidad.
8. **Vehículo y Maquinaria**: Datos del conductor, cédula, placa y revisión técnico-mecánica.
9. **Resultado & Resumen**: Dictamen consolidado (`PASS`, `CONDITIONAL`, `FAIL`), balance de hallazgos y notas del inspector.
10. **Firma Digital & Cierre**: Canvas táctil para firma del operario/inspector y envío formal a revisión técnica de Mateo.

### B. Motor de Generación de Informes PDF Corporativos
El sistema cuenta con un motor de renderizado vectorial en servidor (`pdfkit`) que genera un documento con diseño corporativo internacional:
- Encabezado membretado con código único de informe (`INS-2026-xxxxxx`).
- Barra de resumen con badges de dictamen oficial (`✓ PASS` / `✕ FAIL`).
- Tabla estructurada de especificaciones de contenedor y peso de carga.
- Checklist de condiciones generales con badges vectoriales y observaciones.
- Matriz fotográfica organizada en cuadrícula con leyendas, fechas de captura y etiquetas de sección.
- Registro de firmas digitales vectorizadas (Inspector y Consultor Mateo).
- Paginación automática y pie de página confidencial (*"Página X de Y"*).

### C. Trazabilidad y Auditoría (Audit Log)
- Barra visual interactiva con las etapas del ciclo de vida:
  $$\text{Creada} \longrightarrow \text{Asignada} \longrightarrow \text{En Proceso} \longrightarrow \text{Revisión (Mateo)} \longrightarrow \text{Aprobada} \longrightarrow \text{Informe Final}$$
- Registro inmutable de cada acción (`audit_logs`) con usuario, rol, acción, dirección IP, registro afectado y valores anteriores/nuevos.

---

## 4. Verificación y Pruebas Realizadas

- [x] **Base de Datos SQLite**: Esquema relacional con llaves foráneas, tablas de compañías, usuarios, inspecciones, contenedores, checklists, hallazgos, firmas y auditoría.
- [x] **Seeding Demo**: Cuentas precargadas para los 4 roles con 4 inspecciones en estados reales (`APROBADA`, `PENDIENTE_REVISION`, `EN_PROCESO`, `EN_CORRECCION`).
- [x] **Compilación TypeScript**: Frontend Vite y Backend Express compilan con 0 errores y 0 advertencias.
- [x] **Generador PDF**: Verificada la generación automática de archivos PDF en disco (`uploads/reports/REPORT_INS-2026-xxxxxx.pdf`) accesibles para descarga inmediata.
- [x] **Servidor Activo**: Ambos servidores corriendo en segundo plano y respondiendo con código HTTP `200 OK`.
