import * as aws from '@aws-sdk/client-s3';
import { promises } from 'fs';

export class UploadToS3 {
    private readonly PREFIX = "troll-thumbnails/";

    private bucket: aws.S3;

  constructor() {
    this.bucket = new aws.S3({
      region: 'us-east-1',
    });
  }

  public async execute(path: string, filename: string): Promise<string> {
    const fileContent = await promises.readFile(path);

    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: this.PREFIX + filename,
      Body: fileContent,
    };

    await this.bucket.send(new aws.PutObjectCommand(params));

    const url = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${this.PREFIX}${filename}`;

    return url;
  }
}
