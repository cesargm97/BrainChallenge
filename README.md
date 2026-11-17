# 🧠 BRAINCHALLENGE
### Sistema Web de Evaluaciones y Gestión de Preguntas

Aplicación web interactiva de evaluaciones tipo Quiz, desarrollada con arquitectura **Full Stack**, que permite gestionar usuarios, categorías, preguntas, opciones de respuesta y resultados mediante una integración entre tecnologías web y Oracle Database.

El sistema está orientado al aprendizaje y evaluación de conocimientos mediante cuestionarios dinámicos, con almacenamiento persistente de información y funcionalidades de administración.

---

## 📌 1. Descripción del proyecto

**BrainChallenge** es un sistema web diseñado para facilitar la realización de evaluaciones y la gestión de preguntas por categorías temáticas.

Los usuarios pueden registrarse, iniciar sesión, seleccionar categorías, responder cuestionarios de opción múltiple y consultar sus resultados.

La aplicación utiliza un backend desarrollado con Node.js y Express.js, conectado a una base de datos Oracle Database 21c XE.

El proyecto contempla funcionalidades administrativas para gestionar los contenidos, usuarios y estadísticas de las evaluaciones.

## 🎯 2. Objetivos

- Desarrollar una aplicación web interactiva de evaluaciones.
- Implementar una arquitectura cliente-servidor.
- Gestionar usuarios mediante registro e inicio de sesión.
- Organizar preguntas mediante categorías temáticas.
- Implementar cuestionarios con opciones múltiples.
- Procesar y almacenar resultados.
- Garantizar la persistencia de datos mediante Oracle Database.
- Incorporar herramientas de administración, auditoría y estadísticas.

## 🛠️ 3. Tecnologías utilizadas

| Componente | Tecnología |
|---|---|
| Frontend | HTML5, CSS3, JavaScript Vanilla |
| Comunicación | Fetch API |
| Backend | Node.js |
| Framework | Express.js |
| Base de datos | Oracle Database 21c XE |
| Driver Oracle | oracledb (Thin Mode) |
| Gráficos | Chart.js |
| Tablas interactivas | DataTables |
| Sesiones del navegador | LocalStorage |
| Gestor de paquetes | npm |
| Control de versiones | Git |
| Repositorio | GitHub |
| Editor | Visual Studio Code |

## 🏗️ 4. Arquitectura del sistema

BrainChallenge utiliza una arquitectura cliente-servidor organizada en tres capas:

**Capa de presentación (Frontend)**

Desarrollada con HTML5, CSS3 y JavaScript. Gestiona la interfaz de usuario y las interacciones mediante Fetch API.

**Capa lógica (Backend)**

Desarrollada con Node.js y Express.js. Procesa las solicitudes HTTP, ejecuta validaciones y administra las operaciones del sistema.

**Capa de persistencia (Base de datos)**

Implementada en Oracle Database 21c XE. Almacena los usuarios, categorías, preguntas, opciones y resultados.

### Flujo de comunicación

```text
          USUARIO
             |
             v
       FRONTEND WEB
       HTML / CSS / JS
             |
             | Fetch API
             v
        BACKEND REST
       Node.js / Express
             |
             | oracledb
             v
      ORACLE DATABASE
          XEPDB1
             |
             v
       DATOS PERSISTENTES
```

## 📁 5. Estructura del proyecto

```text
BrainChallenge1/
│
├── backend/
│   ├── config/
│   │   └── database.js
│   │
│   ├── server.js
│   ├── package.json
│   ├── package-lock.json
│   └── .env
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── main.js
│
├── database/
│   ├── database.sql
│   └── README_DATABASE.md
│
├── .gitignore
└── README.md
```

*La estructura debe mantenerse sincronizada con los nombres reales de los archivos del repositorio.*

## 📚 6. Categorías de evaluación

El sistema contempla seis categorías temáticas:

1. Capitales.
2. Programación.
3. Historia.
4. Ciencias Naturales.
5. Lógica y Razonamiento.
6. Cultura General.

Las categorías permiten organizar las preguntas y facilitar la selección de evaluaciones según diferentes áreas de conocimiento.

## ⚙️ 7. Funcionamiento general

1. El usuario accede a la aplicación.
2. Se registra o inicia sesión.
3. Selecciona una categoría temática.
4. El frontend solicita las preguntas al backend.
5. El servidor consulta la información almacenada en Oracle.
6. Las preguntas y opciones se presentan en pantalla.
7. El usuario responde el cuestionario.
8. El sistema procesa las respuestas y calcula el puntaje.
9. Los resultados se almacenan en la base de datos.
10. El usuario puede consultar su rendimiento.

## 🗄️ 8. Base de datos

El proyecto utiliza **Oracle Database 21c Express Edition (XE)**.

| Parámetro | Configuración |
|---|---|
| Motor | Oracle Database 21c XE |
| PDB | XEPDB1 |
| Puerto predeterminado | 1521 |
| Driver | oracledb |
| Modo | Thin |

### Información gestionada

- Usuarios.
- Categorías.
- Preguntas.
- Opciones de respuesta.
- Respuestas correctas.
- Evaluaciones.
- Resultados y puntajes.
- Información de auditoría.

### Archivos de base de datos

El directorio `database/` contiene los recursos necesarios para reconstruir la base de datos del proyecto.

- `database.sql`: script SQL para crear los objetos y cargar los datos.
- `README_DATABASE.md`: instrucciones para ejecutar el script mediante SQL*Plus.

La restauración debe realizarse antes de iniciar el backend.

## 🔌 9. Backend y API REST

El backend está desarrollado con Node.js y Express.js.

Sus responsabilidades comprenden:

- Gestionar solicitudes HTTP.
- Administrar la conexión con Oracle Database.
- Consultar categorías y preguntas.
- Procesar respuestas y resultados.
- Gestionar usuarios.
- Aplicar validaciones.
- Proporcionar servicios mediante endpoints REST.
- Facilitar las funcionalidades administrativas.

La comunicación con Oracle se realiza mediante el paquete `oracledb` en modo Thin.

## 🔐 10. Seguridad y autenticación

El sistema contempla un mecanismo de sesión temporal mediante LocalStorage.

Se consideran las siguientes medidas:

- Protección de las credenciales de conexión mediante variables de entorno.
- Validación de los datos recibidos en el backend.
- Protección de contraseñas mediante hashing.
- Control de acceso a funcionalidades administrativas.
- Validación de sesiones y permisos en el servidor.

**Nota:** LocalStorage permite conservar información en el navegador, pero no constituye por sí solo un mecanismo seguro de autenticación. La autorización debe verificarse en el backend.

## 📊 11. Panel de administración

El proyecto contempla un módulo administrativo para gestionar y supervisar el sistema.

Sus funcionalidades previstas incluyen:

- Gestión de usuarios.
- Administración de categorías.
- Creación y modificación de preguntas.
- Gestión de opciones de respuesta.
- Consulta de resultados.
- Auditoría de operaciones.
- Estadísticas de evaluaciones.
- Visualización de gráficos.
- Tablas interactivas.

## 💻 12. Instalación y ejecución local

### 12.1. Requisitos previos

Para ejecutar BrainChallenge se necesita:

- Windows 10/11 o sistema operativo compatible.
- Node.js y npm.
- Oracle Database 21c Express Edition.
- SQL*Plus.
- Visual Studio Code o editor equivalente.
- Git (opcional, para clonar el repositorio).

### 12.2. Clonar el repositorio

```bash
git clone https://github.com/cesargm97/BrainChallenge.git
```

### 12.3. Ingresar al proyecto

```bash
cd BrainChallenge
```

### 12.4. Preparar la base de datos

Antes de iniciar el backend:

1. Iniciar el servicio de Oracle Database 21c XE.
2. Verificar que la PDB `XEPDB1` esté abierta.
3. Abrir SQL*Plus.
4. Conectarse al usuario correspondiente.
5. Ejecutar el script `database.sql`.
6. Verificar que las tablas y registros se hayan creado correctamente.

Ejemplo de conexión:

```sql
sqlplus USUARIO/CONTRASEÑA@localhost:1521/XEPDB1
```

Ejecutar el script desde SQL*Plus:

```sql
@C:\ruta\del\proyecto\database\database.sql
```

**Importante:** ajustar la ruta del archivo y utilizar el usuario de base de datos para el que fue preparado el script.

Para más información, consultar `database/README_DATABASE.md`.

### 12.5. Instalar dependencias del backend

Desde la terminal:

```bash
cd backend
npm install
```

### 12.6. Configurar las variables de entorno

Crear un archivo `.env` dentro de `backend/`:

```env
PORT=3000

DB_USER=TU_USUARIO
DB_PASSWORD=TU_PASSWORD
DB_CONNECT_STRING=localhost:1521/XEPDB1
```

Reemplazar los valores de ejemplo por las credenciales correspondientes a Oracle.

No compartir ni subir este archivo al repositorio.

### 12.7. Iniciar el servidor

Ejecutar:

```bash
npm run dev
```

Si la configuración es correcta, el backend iniciará y quedará escuchando en el puerto configurado.

Dirección local:

```text
http://localhost:3000
```

### 12.8. Acceder al frontend

Abrir el archivo `index.html` mediante el mecanismo de ejecución configurado para el proyecto.

Si el frontend utiliza Fetch API, sus solicitudes deben apuntar a la dirección correcta del backend y tener configurada la política CORS correspondiente.

## 🧪 13. Verificación del funcionamiento

Para comprobar la instalación se recomienda realizar las siguientes verificaciones:

- Confirmar que Oracle Database esté disponible.
- Comprobar que `XEPDB1` se encuentre abierta.
- Verificar que las tablas tengan los registros iniciales.
- Confirmar que Node.js y Express inicien sin errores.
- Comprobar la conexión entre backend y Oracle.
- Verificar las solicitudes entre frontend y backend.
- Comprobar la carga de categorías y preguntas.
- Ejecutar una evaluación de prueba.
- Verificar el almacenamiento de los resultados, si esa funcionalidad está implementada.

## 📈 14. Estado del desarrollo

BrainChallenge se encuentra en proceso de desarrollo e integración.

| Componente | Estado |
|---|---|
| Diseño inicial del frontend | Implementado |
| HTML5, CSS3 y JavaScript | Implementado |
| Oracle Database 21c XE | Configurado |
| Estructura inicial de datos | Creada |
| Categorías temáticas | Incorporadas |
| Backend Node.js | Inicializado |
| Express.js y dependencias | Configurados |
| Integración backend - Oracle | En desarrollo |
| API REST | En desarrollo |
| Registro e inicio de sesión | Pendiente de verificar |
| Persistencia de resultados | Pendiente de verificar |
| Panel administrativo | En desarrollo |
| Auditoría y estadísticas | Pendiente de verificar |
| Pruebas integrales | Pendiente |

*Los estados deben actualizarse según las funcionalidades efectivamente terminadas y probadas.*

## 👨‍💻 15. Autor

**César Giménez**

Estudiante de Ingeniería en Informática.

Proyecto académico integrador.

## 📄 16. Licencia

Proyecto desarrollado con fines académicos y educativos.

---

**BRAINCHALLENGE**

*Aprende, responde y supera tus conocimientos.*
