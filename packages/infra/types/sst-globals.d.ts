import type * as _aws from '@pulumi/aws';
import type * as _pulumi from '@pulumi/pulumi';

declare global {
  namespace sst {
    namespace aws {
      function dns(args?: {
        zone?: string;
        override?: boolean;
        transform?: {
          record?: Record<string, unknown>;
        };
      }): {
        provider: string;
        createAlias: (...args: unknown[]) => unknown;
        createCaa: (...args: unknown[]) => unknown;
        createRecord: (...args: unknown[]) => unknown;
      };

      class Bucket {
        constructor(
          name: string,
          args?: Record<string, unknown>,
          opts?: _pulumi.ComponentResourceOptions
        );
        name: _pulumi.Output<string>;
        domain: _pulumi.Output<string>;
      }

      class Router {
        constructor(
          name: string,
          args?: Record<string, unknown>,
          opts?: _pulumi.ComponentResourceOptions
        );
      }

      class Vpc {
        constructor(
          name: string,
          args?: Record<string, unknown>,
          opts?: _pulumi.ComponentResourceOptions
        );
        id: _pulumi.Output<string>;
        publicSubnets: _pulumi.Output<string[]>;
        privateSubnets: _pulumi.Output<string[]>;
      }
    }
  }

  // Pulumi AWS is the only real global namespace we need for infra typing.
  export import aws = _aws;

  const $app: {
    name: string;
    stage: string;
    removal: 'remove' | 'retain' | 'retain-all';
    providers: Record<string, unknown>;
    protect: boolean;
  };

  const $config: (input: {
    app(input: { stage?: string; [key: string]: unknown }):
      | {
          name: string;
          removal?: 'remove' | 'retain' | 'retain-all';
          protect?: boolean;
          home?: string;
          providers?: Record<string, unknown>;
          [key: string]: unknown;
        }
      | Promise<{
          name: string;
          removal?: 'remove' | 'retain' | 'retain-all';
          protect?: boolean;
          home?: string;
          providers?: Record<string, unknown>;
          [key: string]: unknown;
        }>;
    run(): unknown;
    console?: unknown;
  }) => unknown;
}

export {};
