declare module "ali-oss" {
  export interface OSSOptions {
    accessKeyId: string;
    accessKeySecret: string;
    bucket: string;
    region: string;
  }

  export interface SignatureUrlOptions {
    expires?: number;
    method?: string;
  }

  export class OSS {
    constructor(options: OSSOptions);
    signatureUrl(name: string, options?: SignatureUrlOptions): string;
    delete(name: string): Promise<any>;
    head(name: string): Promise<any>;
  }

  export default OSS;
}
