# ASEATI

Sitio web informativo de la **Asociación de Estudiantes de Administración de Tecnología de Información** (ASEATI) del Tecnológico de Costa Rica.

## Desarrollo local

```bash
npm install
npm run dev
```

Para probar el panel admin con APIs en local:

```bash
vercel dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy

- Producción: https://aseati.com (mientras el DNS propaga: https://aseati.vercel.app)
- Panel admin: `/admin` (mismo dominio)
- Repositorio: https://github.com/avegacr/ASEATI

## Panel de administración

Las futuras generaciones pueden editar textos, junta, fotos, contactos, remodelación y reglamento **sin tocar código**.

1. Entrá a `/admin`
2. Usá la **contraseña compartida** de la Junta
3. Editá la sección que necesites
4. Pulsá **Guardar cambios**
5. Esperá 1–2 minutos a que Vercel republicque el sitio

### Variables de entorno (Vercel)

Configurá estas variables en el proyecto de Vercel (Settings → Environment Variables):

| Variable | Descripción |
| --- | --- |
| `ADMIN_PASSWORD` | Contraseña compartida de la Junta |
| `ADMIN_SECRET` | Secreto para firmar la sesión (cadena larga aleatoria) |
| `GITHUB_TOKEN` | Personal Access Token con permiso de escritura en el repo |
| `GITHUB_REPO` | `avegacr/ASEATI` |
| `GITHUB_BRANCH` | `main` |
| `DEPLOY_HOOK_URL` | (Opcional) Deploy Hook de Vercel para forzar redeploy al guardar |
| `SITE_URL` | Origen público. Hoy `https://aseati.vercel.app`; al activar el dominio, `https://aseati.com` |
| `CONTACT_TO_EMAIL` | (Opcional) Destino del buzón. Por defecto `aseati@estudiantec.cr` |
| `WEB3FORMS_ACCESS_KEY` | Clave de [Web3Forms](https://web3forms.com) para entregar el buzón a `aseati@estudiantec.cr` |
| `RESEND_API_KEY` | (Opcional) Alternativa a Web3Forms |

### Cambiar la contraseña cada año

1. En Vercel, actualizá `ADMIN_PASSWORD`
2. Redeploy del proyecto
3. Compartí la nueva clave solo con la Junta entrante

### Contenido editable

El contenido vive en [`public/data/site.json`](public/data/site.json). El diseño (CSS/layout) sigue en el código.
