# Setup — Rutas Europan

Guía paso a paso para poner en marcha la PWA.

---

## 1. Crear el Google Sheet

1. Ve a [Google Sheets](https://sheets.google.com) y crea un documento nuevo.
2. Nómbralo **"Rutas Europan"** (o el nombre que prefieras).

## 2. Configurar las pestañas y el backend

### Opción A: Automática (recomendada)

1. En el Sheet, ve a **Extensiones → Apps Script**.
2. Borra todo el contenido del archivo `Código.gs`.
3. Copia y pega el contenido del archivo `apps_script.js` de este proyecto.
4. En el menú de funciones (arriba), selecciona **`setupHeaders`**.
5. Haz clic en **▶️ Ejecutar**.
6. Autoriza los permisos cuando te lo pida Google.
7. Esto creará automáticamente las **20 pestañas** con sus cabeceras.

### Opción B: Manual

Crea 20 pestañas con estos nombres exactos:

| Ruta | Lunes | Martes | Miércoles | Jueves | Viernes |
|------|-------|--------|-----------|--------|---------|
| 2 | Ruta2_Lunes | Ruta2_Martes | Ruta2_Miércoles | Ruta2_Jueves | Ruta2_Viernes |
| 3 | Ruta3_Lunes | Ruta3_Martes | Ruta3_Miércoles | Ruta3_Jueves | Ruta3_Viernes |
| 4 | Ruta4_Lunes | Ruta4_Martes | Ruta4_Miércoles | Ruta4_Jueves | Ruta4_Viernes |
| 5 | Ruta5_Lunes | Ruta5_Martes | Ruta5_Miércoles | Ruta5_Jueves | Ruta5_Viernes |

En cada pestaña, pon estas cabeceras en la **fila 1**:

```
Orden | Cliente | Dirección_1 | Maps_URL_1 | Dirección_2 | Maps_URL_2 | Tipo_descarga | Notas
```

## 3. Desplegar el Apps Script como Web App

1. En el editor de Apps Script, haz clic en **Implementar → Nueva implementación**.
2. Haz clic en el engranaje ⚙️ y selecciona **Aplicación web**.
3. **Ejecutar como**: Yo (tu email).
4. **Quién tiene acceso**: **Cualquier persona**.
5. Haz clic en **Implementar**.
6. **Copia la URL** que aparece (será algo como `https://script.google.com/macros/s/.../exec`).

> **⚠️ IMPORTANTE**: Cada vez que modifiques el código del Apps Script, debes crear una **nueva implementación** para que los cambios surtan efecto. Ve a Implementar → Gestionar implementaciones → crear nueva versión.

## 4. Configurar la URL en la PWA

1. Abre el archivo **`app.js`** con un editor de texto.
2. Busca esta línea al principio del archivo:
   ```javascript
   SCRIPT_URL: ''
   ```
3. Pega la URL del paso anterior entre las comillas:
   ```javascript
   SCRIPT_URL: 'https://script.google.com/macros/s/TU_ID_AQUI/exec'
   ```
4. Guarda el archivo.

## 5. Desplegar la PWA

Puedes usar cualquier hosting estático gratuito:

### Opción rápida: GitHub Pages
1. Sube los archivos a un repositorio de GitHub.
2. Ve a Settings → Pages → Deploy from branch `main`.
3. En unos minutos tendrás la URL pública.

### Opción local para probar
```bash
npx -y serve .
```

## 6. Instalar en el móvil

1. Abre la URL en el navegador del móvil (Chrome/Brave).
2. Pulsa el menú **⋮** → **"Añadir a pantalla de inicio"**.
3. La app se instalará como si fuera una app nativa.

---

## Valores de Tipo_descarga

| Valor | Comportamiento |
|-------|----------------|
| `única` | Un solo botón 📍 Maps (usa Dirección_1/Maps_URL_1) |
| `ambas` | Dos botones: 📍 Parada 1 y 📍 Parada 2 |
| `elegir` | Dos botones con etiqueta "Elige destino hoy": 📍 Dir. 1 y 📍 Dir. 2 |
