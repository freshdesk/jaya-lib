import { Datastore } from '@google-cloud/datastore';
import { GoogleServiceAccountConfig } from './GoogleServiceAccount';
import { google } from 'googleapis';

/**
 * This code is only for including googleapis in here.
 * It solves the versioning problem of some of the dependencies @google-cloud.
 */
const apis = google.getSupportedAPIs();
JSON.stringify(apis);

export interface GoogleCloudStorageConfig extends GoogleServiceAccountConfig {
  keyKind: string;
}

export class GoogleCloudStorage {
  private datastore: Datastore;

  private keyKind: string;

  constructor(config: GoogleCloudStorageConfig) {
    this.keyKind = config.keyKind;
    this.datastore = new Datastore({
      credentials: {
        client_email: config.client_email,
        private_key: config.private_key,
      },
      projectId: config.project_id,
    });
  }

  save(keyName: string, value: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const key = this.datastore.key([this.keyKind, Datastore.int(keyName)]);
      this.datastore.save(
        {
          data: value,
          key,
        },
        (err?: unknown, resp?: unknown): void => {
          if (resp) {
            resolve(resp);
          } else {
            reject(new Error('Error saving in google cloud storage'));
          }
        },
      );
    });
  }

  delete(keyName: string): Promise<unknown> {
    const key = this.datastore.key([this.keyKind, Datastore.int(keyName)]);
    return new Promise((resolve, reject) => {
      this.datastore.delete(key, (err?: unknown, resp?: unknown): void => {
        if (resp) {
          resolve(resp);
        } else {
          reject(new Error('Error deleting key in google cloud storage'));
        }
      });
    });
  }
}
