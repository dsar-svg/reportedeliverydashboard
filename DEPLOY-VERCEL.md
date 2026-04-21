# Instrucciones para desplegar en Vercel (Gratis)

## Paso 1: Preparar el proyecto para subir a GitHub

1. Ve a https://github.com/new
2. Crea un nuevo repositorio (público o privado)
3. Sube el proyecto:

```bash
cd C:\Users\pasante.ivooapp\Desktop\D\REPORTESAPP
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/NOMBRE-REPO.git
git push -u origin main
```

## Paso 2: Crear cuenta en Vercel

1. Ve a https://vercel.com/signup
2. Regístrate con tu cuenta de GitHub (recomendado)
3. Es completamente GRATIS para proyectos personales

## Paso 3: Importar proyecto

1. En el dashboard de Vercel, haz clic en "Add New..." → "Project"
2. Selecciona tu repositorio de GitHub
3. Vercel detectará automáticamente que es un proyecto Next.js

## Paso 4: Configurar Variables de Entorno

En la página de configuración del proyecto, añade estas variables:

```
GOOGLE_SHEET_ID=1aJ67--rYVLWO4OyuWPJKO6pevYs6rLUq2atslq51Eq4
GOOGLE_CLIENT_EMAIL=reportes-delivery@testingivoo-12.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY=Pega_aqui_la_clave_completa_del_JSON
```

**IMPORTANTE:** Para `GOOGLE_SERVICE_ACCOUNT_KEY`, debes:
1. Abrir el archivo `testingivoo-12-832dd77e3244.json`
2. Copiar TODO el contenido del archivo
3. Pegarlo en el campo de Vercel

## Paso 5: Deploy

1. Haz clic en "Deploy"
2. Espera 2-3 minutos
3. ¡Listo! Tendrás una URL como: `https://tu-proyecto.vercel.app`

## Compartir el Google Sheet

**IMPORTANTE:** Asegúrate de compartir tu Google Sheet con:
```
reportes-delivery@testingivoo-12.iam.gserviceaccount.com
```

Dale permisos de "Lector" o "Editor".

## URL Final

Tu aplicación estará disponible en:
- `https://tu-proyecto.vercel.app` (automático)

## ¿Por qué funciona en Vercel?

- ✅ Servidores de Vercel tienen hora sincronizada con Google
- ✅ Infraestructura optimizada para Next.js
- ✅ SSL incluido gratis
- ✅ Dominio personalizado disponible (opcional)
