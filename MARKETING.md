# Guia para Marketing - Pixels y Snippets

## Archivos que puedes editar

Todas las landing pages estan en la carpeta `public/`. Estos son los archivos:

| Archivo | Pagina |
|---------|--------|
| `public/index.html` | Home principal |
| `public/inversionistas.html` | Landing inversionistas |
| `public/propietarios.html` | Landing propietarios |
| `public/nosotros.html` | Nosotros |
| `public/login-inversionistas.html` | Login inversionistas |
| `public/login-propietarios.html` | Login propietarios |
| `public/ty.html` | Pagina de gracias (thank you) |
| `public/politica-privacidad.html` | Politica de privacidad |
| `public/terminos-condiciones.html` | Terminos y condiciones |

## Donde pegar los pixels

Pega el snippet del pixel dentro del `<head>`, justo antes de la etiqueta `</head>`. Ejemplo:

```html
<head>
    <!-- ... todo lo que ya existe ... -->

    <!-- Meta Pixel -->
    <script>
      !function(f,b,e,v,n,t,s)
      {/* ... tu codigo del pixel ... */}
    </script>
    <!-- End Meta Pixel -->

</head>
```

## Archivos que NO debes tocar

- Todo lo que este en `src/` (codigo de la plataforma)
- `package.json`, `next.config.js`, `tsconfig.json`
- Archivos `.env` o de configuracion

## Como hacer cambios

1. Crea una rama nueva: `git checkout -b marketing/nombre-del-cambio`
2. Edita los archivos HTML en `public/`
3. Haz commit y push:
   ```bash
   git add public/
   git commit -m "add: pixel de Meta/TikTok/etc"
   git push origin marketing/nombre-del-cambio
   ```
4. Abre un Pull Request en GitHub hacia `main`
5. Espera aprobacion — una vez aprobado se despliega automaticamente

## Tip

Si necesitas agregar el mismo pixel a todas las landing pages, repite el snippet en el `<head>` de cada archivo HTML que aparece en la tabla de arriba.
