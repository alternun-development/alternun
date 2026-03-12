---
sidebar_position: 3
---

# Arquitectura en Tiempo de Ejecución

El sistema en ejecución es una combinación de aplicaciones cliente, servicios gestionados y servicios personalizados alojados en AWS.

La forma más simple de entenderlo es seguir los límites de confianza.

## Topología De Runtime

```mermaid
flowchart LR
  subgraph Client["Superficies cliente"]
    AIRS[AIRS app<br/>Expo / React Native / Web]
    Admin[Consola admin<br/>Vite / React / Refine]
    Docs[Sitio de docs<br/>Docusaurus]
  end

  subgraph Identity["Límite de identidad"]
    Authentik[Proveedor OIDC Authentik]
  end

  subgraph Data["Datos de la aplicación y estado del negocio"]
    Supabase[Supabase]
  end

  subgraph Custom["Backend personalizado e integraciones"]
    API[API NestJS + Fastify]
    GitHub[GitHub y Decap]
  end

  AIRS --> Authentik
  AIRS --> Supabase

  Admin --> Authentik
  Admin --> API

  Docs --> Authentik
  Docs --> API
  API --> GitHub

  API --> Supabase
```

## Modelo De Confianza

La dirección actual de identidad del repositorio es esta:

- Authentik es el proveedor de identidad y la fuente de verdad para OIDC
- Supabase sigue siendo la capa de datos y autorización de la aplicación
- las capacidades backend personalizadas viven en la API de NestJS

Esto crea un modelo de runtime híbrido:

- la identidad no pertenece al frontend
- los datos principales del producto no están codificados dentro de la API
- algunos flujos siguen guiados por servicios mientras la API personalizada crece con el tiempo

## Runtime De AIRS

En AIRS, el runtime actual gira alrededor de la app construida con Expo:

- la misma familia de aplicaciones soporta comportamiento móvil nativo y publicación web
- la autenticación se abstrae a través del paquete compartido de auth
- Supabase ya forma parte del modelo de integración del lado cliente
- el comportamiento relacionado con wallets existe dentro del stack de la app pública

En otras palabras, AIRS no es solo un frontend estático de marketing. Es el comienzo del runtime real de la aplicación.

## Runtime Del Admin

La consola admin está separada intencionalmente de la app pública AIRS:

- tiene su propio objetivo de despliegue
- usa flujos OIDC a través de Authentik
- está pensada para uso interno y operativo
- puede publicarse junto con la API personalizada dentro de dashboard stacks combinados

Esa separación reduce el acoplamiento accidental entre los recorridos de usuarios públicos y los flujos internos de operación.

## Runtime De La Documentación

El sistema de docs tiene dos modos:

1. entrega pública de documentación con Docusaurus
2. flujo editorial protegido mediante Decap CMS y gating con Authentik

Eso significa que la documentación se trata como una superficie real de producto, con autenticación, flujo de contenido y dependencias de infraestructura, no solo como una carpeta estática de archivos markdown.

## Flujo De Ejemplo: Inicio De Sesión En AIRS

```mermaid
sequenceDiagram
  participant User as Usuario
  participant AIRS as AIRS app
  participant Auth as Authentik
  participant Data as Supabase

  User->>AIRS: Abre la app y solicita iniciar sesión
  AIRS->>Auth: Inicia el flujo OIDC o de autenticación
  Auth-->>AIRS: Devuelve la sesión y los claims
  AIRS->>Data: Usa acceso a la aplicación respaldado por la sesión
  Data-->>AIRS: Devuelve el estado visible para el usuario
  AIRS-->>User: Renderiza el dashboard y las funciones de la app
```

## Flujo De Ejemplo: Edición De Docs

```mermaid
sequenceDiagram
  participant Editor as Editor
  participant Docs as Página admin de Docusaurus
  participant Auth as Authentik
  participant API as API NestJS
  participant GitHub as GitHub

  Editor->>Docs: Abre /admin
  Docs->>Auth: Verifica la sesión del editor
  Auth-->>Docs: Devuelve una sesión aprobada
  Docs->>API: Inicia el puente OAuth de Decap
  API->>GitHub: Intercambia la autorización OAuth
  GitHub-->>API: Devuelve el token
  API-->>Docs: Devuelve el resultado del popup a Decap
  Docs-->>Editor: Abre el editor del CMS
```

## Qué Vive Dónde Hoy

### Principalmente impulsado por cliente hoy

- renderizado de la UI de AIRS
- manejo de sesión del lado de la app
- presentación multilingüe
- composición de recorridos e interfaces de usuario

### Principalmente impulsado por servicios hoy

- identity
- aprovisionamiento de infraestructura
- pipelines de despliegue
- publicación de documentación

### Área de backend personalizado que sigue creciendo

- API operativa de NestJS
- documentación OpenAPI
- puntos de integración como endpoints de puente OAuth
- lógica futura de dominio backend que no debería quedarse en los clientes

## Realidad Arquitectónica Importante

Este repositorio todavía no es una arquitectura de "un solo backend lo controla todo".

Es una plataforma en transición:

- algunas capacidades ya están centralizadas
- otras se delegan intencionalmente a servicios gestionados
- otras aún se están moviendo desde patrones del lado cliente hacia servicios backend dedicados

Eso no es un problema por sí mismo, pero es importante que quienes contribuyen lo entiendan antes de proponer refactors grandes.
