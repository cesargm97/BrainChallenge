# 🧠 BrainChallenge - Proyecto Full Stack

Aplicación web interactiva de preguntas y respuestas (Quiz) con arquitectura Full Stack. El sistema permite a los usuarios registrarse, iniciar sesión, jugar quizzes por categorías y guardar su progreso en una base de datos Oracle. Incluye un panel de administración con auditoría y estadísticas avanzadas.

## 🛠️ Tecnologías Utilizadas

- **Backend:** Node.js + Express
- **Base de Datos:** Oracle XE 21c (PDB: `XEPDB1`)
- **Driver Oracle:** `oracledb` (modo Thin)
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Librerías Frontend:** Chart.js (gráficos), DataTables (tablas interactivas).
- **Autenticación:** LocalStorage (Sesión temporal con tiempo de expiración).

## 📁 Estructura del Proyecto

```text
BrainChallenge1/
├── backend/
│   ├── config/
│   │   └── database.js       # Configuración del pool de conexiones
│   ├── server.js             # API REST y lógica del servidor
│   ├── .env                  # Variables de entorno (No incluido en Git)
│   └── package.json
├── frontend/
│   ├── index.html            # Interfaz de usuario
│   ├── style.css             # Estilos y paleta de colores
│   └── main.js               # Lógica del frontend (Fetch API, DOM)
├── .gitignore
└── README.md