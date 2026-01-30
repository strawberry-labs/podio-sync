import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface FieldChange {
  fieldId: string;
  externalId: string;
  label: string;
  type: string;
  from: any;
  to: any;
}

export interface UpdateFromPodioPayload {
  podioItemId: number;
  appSlug: string;
  changes: FieldChange[];
  revision: number;
  timestamp: string;
}

export interface BasecampResponse {
  success: boolean;
  message?: string;
  processedChanges?: number;
  errors?: string[];
}

@Injectable()
export class BasecampService {
  private readonly logger = new Logger(BasecampService.name);
  private readonly apiUrl: string;
  private readonly sharedSecret: string;

  constructor(private configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('BASECAMP_API_URL') || 'https://events.ecoventureme.com/api';
    this.sharedSecret = this.configService.get<string>('SHARED_SECRET') || '';
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.sharedSecret) {
      headers['X-API-Key'] = this.sharedSecret;
    }
    return headers;
  }

  async notifyFieldChanges(
    podioItemId: string,
    appSlug: string,
    changes: FieldChange[],
    revision: number,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    if (changes.length === 0) {
      this.logger.log('No monitored field changes to sync');
      return { success: true };
    }

    const payload: UpdateFromPodioPayload = {
      podioItemId: parseInt(podioItemId, 10),
      appSlug,
      changes,
      revision,
      timestamp: new Date().toISOString(),
    };

    this.logger.log(`Sending field changes to Basecamp for Podio item: ${podioItemId}`);
    this.logger.log('Payload:', JSON.stringify(payload, null, 2));

    try {
      const response = await axios.post<BasecampResponse>(
        `${this.apiUrl}/update-from-podio`,
        payload,
        { headers: this.getHeaders() },
      );

      this.logger.log(`Basecamp response: ${response.data.message}`);
      this.logger.log(`Processed ${response.data.processedChanges} change(s)`);

      return {
        success: true,
        message: response.data.message,
      };
    } catch (error) {
      this.logger.error('Failed to send changes to Basecamp:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }
}
