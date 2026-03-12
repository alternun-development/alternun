---
sidebar_position: 5
---

# Seguridad y Calidad

La seguridad en este repositorio es una combinación de controles en runtime, guardrails de infraestructura y disciplina en el flujo de desarrollo.

El punto importante para quienes contribuyen es este:

**la calidad no es una sola herramienta**. Es una cadena de controles que atraviesa código de aplicación, identity, despliegue y revisión.

## Modelo De Seguridad Hoy

### Límite de identidad

La dirección actual de la arquitectura es:

- Authentik es el proveedor de identidad
- Supabase sigue siendo una capa de datos y autorización
- los clientes de app y admin no se convierten en su propia fuente de verdad de identidad

Es una buena separación porque mantiene explícita la propiedad de la autenticación.

### Manejo de entradas en la API

La API de NestJS ya activa valores de validación importantes:

- `ValidationPipe`
- `whitelist: true`
- `transform: true`
- `forbidNonWhitelisted: true`

Esos valores por defecto reducen errores comunes en la forma de entrada y el over-posting accidental.

### Manejo de secretos y entorno

El repositorio también tiene un manejo del entorno orientado primero a la infraestructura:

- scripts de despliegue centrados en el entorno
- integración con Secrets Manager en el stack de identity
- configuración sensible al stage
- protecciones de despliegue alrededor de tipos de stack y reconciliación de pipelines

## Controles De Calidad En El Repositorio

### Controles estáticos de calidad

- TypeScript en apps y paquetes
- ESLint
- Prettier
- `lint-staged`
- hooks de Husky para pre-commit y pre-push
- `eslint-plugin-security`

### Controles de validación y release

- scripts de validación de versión
- hooks de escaneo de secretos
- orquestación con Turbo para `build`, `lint`, `type-check` y `test`
- scripts de seguridad de ramas y pipelines en `packages/infra/scripts`

### Calidad de documentación y API

- las docs de Docusaurus se construyen desde el mismo monorepo
- la API expone docs con Swagger / OpenAPI
- ya existen docs operativas dentro del repo para decisiones de identity e infra

## Checklist Para Contribuidores

Cuando cambies código en este repositorio, conviene revisar de forma activa:

1. **Validación de entrada**: ¿el endpoint o la función valida estrictamente forma y tipo?
2. **Manejo de secretos**: ¿se está filtrando algún secreto a código cliente, logs o archivos versionados?
3. **Límite de auth**: ¿el cambio respeta el modelo de identidad existente en lugar de saltárselo?
4. **Conciencia de stage**: ¿el cambio se comporta bien en dev, producción y contextos preview/testnet?
5. **Seguridad de infra**: ¿el cambio podría causar efectos destructivos en despliegue?
6. **Impacto en docs**: ¿el comportamiento público u operativo necesita actualizar documentación?

## Fortalezas Actuales

Estas son señales positivas que ya existen en el repositorio:

- separación clara entre app pública, admin, docs, API e infra
- identity tratada como un subsistema dedicado
- infraestructura gestionada como código
- automatización de releases presente en el monorepo
- uso de paquetes compartidos en lugar de duplicación descontrolada
- el sitio público de docs ya forma parte de la plataforma

## Brechas y Riesgos Conocidos

La arquitectura actual es lo bastante sólida para crecer, pero aún se ven varias brechas.

### 1. La postura de seguridad de la API necesita endurecerse

Ejemplos:

- CORS sigue siendo permisivo en el bootstrap de Nest
- la superficie de la API personalizada aún es temprana y necesita más hardening de políticas
- se necesitará más cobertura de auth y autorización por endpoint a medida que la API crezca

### 2. La cobertura de pruebas es desigual

Algunas partes del repositorio ya tienen patrones de prueba, pero la cobertura todavía no tiene la misma madurez en cada app y servicio.

### 3. La observabilidad sigue siendo ligera

El runtime en AWS ya incluye logs, pero la plataforma aún necesita una historia operativa más rica alrededor de:

- trazas estructuradas
- dashboards a nivel de servicio
- alertas
- visibilidad de salud a nivel de despliegue

### 4. La automatización de seguridad puede avanzar más

Hay buenas bases, pero el repositorio se beneficiaría de procesos más formales para:

- revisión de dependencias
- generación de SBOM
- procedencia de artefactos
- escaneo de contenedores e imágenes cuando corresponda
- modelado de amenazas para nuevos servicios

### 5. La explicación arquitectónica pública todavía se está poniendo al día

Esta nueva sección mejora la situación, pero las notas de arquitectura todavía tienen que seguir el ritmo de la implementación.

## Flujo De Linting y Seguridad

Para la ingeniería diaria, una base práctica es:

```bash
pnpm lint
pnpm type-check
pnpm test
pnpm --filter @alternun/api run build
pnpm --filter alternun-docs run build
```

Si un cambio toca infraestructura o identity, quienes contribuyan también deberían inspeccionar los scripts y ajustes relevantes en `packages/infra` antes de asumir que un despliegue es seguro.

## Declaración Pública De Postura De Seguridad

Alternun está construyendo en público, pero no debería confundir transparencia con controles laxos.

La postura objetivo es:

- visibilidad pública de la arquitectura
- manejo privado de secretos
- límites de confianza explícitos
- despliegues reproducibles
- valores operativos conservadores por defecto

Ese es el estándar que quienes contribuyen deberían mantener.
