---
sidebar_position: 2
---

# Monorepo y Stack

Alternun usa un monorepo de workspace con pnpm y orquestación con TurboRepo.

Esa decisión es intencional: el repositorio contiene varias apps que comparten infraestructura, patrones de autenticación, traducciones, primitivas de diseño y automatización de releases.

## Estructura Del Workspace

```mermaid
flowchart TD
  Root[monorepo alternun]
  Root --> Apps[apps/*]
  Root --> Packages[packages/*]
  Root --> InternalDocs[docs/*]

  Apps --> Mobile[apps/mobile]
  Apps --> Admin[apps/admin]
  Apps --> API[apps/api]
  Apps --> DocsSite[apps/docs]
  Apps --> Web[apps/web]

  Packages --> Auth[@alternun/auth]
  Packages --> UI[@alternun/ui]
  Packages --> I18n[@alternun/i18n]
  Packages --> Infra[@alternun/infra]
  Packages --> Email[packages/email-templates]
```

## Superficies De Aplicación

### `apps/mobile`

Base de código principal de la aplicación AIRS.

Tecnologías clave:

- Expo
- Expo Router
- React 19
- React Native 0.81
- React Native Web
- cliente JavaScript de Supabase
- WalletConnect
- Firebase
- NativeWind y soporte de estilos orientado a Tailwind

Por qué importa:

- una sola base de código soporta patrones móviles nativos y entrega web
- la familia de dominios públicos AIRS se entrega desde esta app a través de la capa de infraestructura

### `apps/admin`

Consola administrativa interna.

Tecnologías clave:

- Vite
- React 18
- React Router
- Refine
- `oidc-client-ts`

Por qué importa:

- separa los flujos operativos de la experiencia pública de AIRS
- puede desplegarse junto con la API dentro de los dashboard stacks

### `apps/api`

Servicio backend personalizado.

Tecnologías clave:

- NestJS 10
- Fastify 4
- Swagger / OpenAPI
- adaptador para AWS Lambda

Por qué importa:

- le da a la plataforma un lugar para la lógica backend personalizada que no debe vivir en el cliente
- hoy ya incluye endpoints de salud y flujos orientados a integración como el puente OAuth de Decap

### `apps/docs`

Sitio público de documentación.

Tecnologías clave:

- Docusaurus 3
- React
- diagramas Mermaid
- integración con Decap CMS
- `oidc-client-ts` para acceso protegido de editores

Por qué importa:

- ofrece documentación pública de producto y para desarrolladores
- soporta un flujo de edición protegido en vez de editar contenido directamente en producción

### `apps/web`

Aplicación Next.js.

Rol actual:

- superficie web secundaria
- no es el objetivo principal de despliegue público dentro del modelo actual de infraestructura

Esto es importante para quienes llegan al repo por primera vez: el camino principal de despliegue de AIRS es **Expo-web-first**, no Next.js-first.

## Paquetes Compartidos

### `@alternun/auth`

Paquete compartido que envuelve la autenticación.

Propósito:

- centraliza abstracciones de autenticación del lado de las apps
- encapsula la librería de autenticación upstream usada por el proyecto
- agrega comportamiento de cliente orientado a móviles
- incluye scripts de soporte para SES y correo alrededor de identity/email

### `@alternun/ui`

Paquete compartido de componentes de UI.

Propósito:

- mantiene piezas de interfaz reutilizables fuera de una sola app
- soporta reutilización entre varias apps cuando comparten lenguaje de diseño

### `@alternun/i18n`

Paquete compartido de catálogos de traducción.

Propósito:

- punto central para datos de locale y helpers de runtime
- lo reutilizan las apps en lugar de duplicar archivos de traducción por todos lados

### `packages/email-templates`

Soporte para generación y sincronización de correos.

Propósito:

- almacena contenido localizado compartido para emails
- soporta sistemas de entrega posteriores, como la sincronización de plantillas/correos de Supabase

### `@alternun/infra`

Paquete de despliegue y plataforma.

Propósito:

- define recursos de AWS
- controla el mapeo entre dominios y stages
- se encarga de la creación de pipelines y de verificaciones de seguridad de despliegue
- actúa como la columna operativa vertebral del monorepo

## Herramientas Principales

El repositorio se coordina con un conjunto pequeño de herramientas de alto impacto:

- **pnpm** para gestión de paquetes del workspace
- **TurboRepo** para orquestación del grafo de builds
- **TypeScript** en todo el monorepo
- **ESLint** y **Prettier** para higiene de código
- **Husky** y **lint-staged** para enforcement antes del commit

## Modelo De Build y Tareas

En la raíz del repositorio, los comandos comunes están estandarizados:

- `pnpm build`
- `pnpm dev`
- `pnpm lint`
- `pnpm type-check`
- `pnpm test`

Turbo coordina estas tareas para que las dependencias entre paquetes se construyan en el orden correcto.

Eso le da al equipo un punto medio práctico:

- las apps pueden evolucionar de forma independiente
- los paquetes compartidos siguen siendo reutilizables
- los cambios transversales aún pueden verificarse desde un solo conjunto de comandos en raíz

## Por Qué Esta Estructura Funciona

Este monorepo está optimizado para trabajo de plataforma, no para una sola app aislada.

Eso significa que la estructura trata menos de "frontend versus backend" y más de:

- experiencia pública
- operaciones internas
- límites de identidad y confianza
- infraestructura desplegable
- bloques compartidos de producto

Para colaboradores públicos, ese es el modelo mental más importante que conviene tener mientras exploran el código base.
