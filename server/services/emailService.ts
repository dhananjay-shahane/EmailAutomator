import * as Imap from 'imap';
import * as nodemailer from 'nodemailer';
import { simpleParser } from 'mailparser';

export interface EmailConfig {
  imapServer: string;
  smtpServer: string;
  smtpPort: number;
  username: string;
  password: string;
  filterEmail: string;
}

export interface ParsedEmail {
  from: string;
  subject: string;
  body: string;
  messageId: string;
}

export class EmailService {
  private config: EmailConfig;
  private imapConnection: any;
  private smtpTransporter: any;

  constructor() {
    this.config = {
      imapServer: process.env.IMAP_SERVER || 'imap.gmail.com',
      smtpServer: process.env.MAIL_SERVER || 'smtp.gmail.com',
      smtpPort: parseInt(process.env.MAIL_PORT || '587'),
      username: process.env.SMTP_USER || process.env.EMAIL_USER || '',
      password: process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD || '',
      filterEmail: process.env.FILTER_EMAIL || '',
    };

    this.initializeSmtp();
  }

  private initializeSmtp() {
    this.smtpTransporter = nodemailer.createTransport({
      host: this.config.smtpServer,
      port: this.config.smtpPort,
      secure: false,
      auth: {
        user: this.config.username,
        pass: this.config.password,
      },
    });
  }

  async connectImap(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.imapConnection = new Imap({
        user: this.config.username,
        password: this.config.password,
        host: this.config.imapServer,
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
      });

      this.imapConnection.once('ready', () => {
        console.log('IMAP connection ready');
        resolve();
      });

      this.imapConnection.once('error', (err: Error) => {
        console.error('IMAP connection error:', err);
        reject(err);
      });

      this.imapConnection.connect();
    });
  }

  async checkForNewEmails(): Promise<ParsedEmail[]> {
    if (!this.imapConnection) {
      await this.connectImap();
    }

    return new Promise((resolve, reject) => {
      this.imapConnection.openBox('INBOX', false, (err: Error) => {
        if (err) {
          reject(err);
          return;
        }

        // Search for unread emails from filter email
        let searchCriteria: any = ['UNSEEN'];
        if (this.config.filterEmail) {
          searchCriteria = [searchCriteria, ['FROM', this.config.filterEmail]];
        }

        this.imapConnection.search(searchCriteria, (err: Error, results: number[]) => {
          if (err) {
            reject(err);
            return;
          }

          if (!results || results.length === 0) {
            resolve([]);
            return;
          }

          const emails: ParsedEmail[] = [];
          let processed = 0;

          const fetchOptions = {
            bodies: '',
            markSeen: true,
          };

          const fetch = this.imapConnection.fetch(results, fetchOptions);

          fetch.on('message', (msg: any) => {
            let emailData = '';

            msg.on('body', (stream: any) => {
              stream.on('data', (chunk: Buffer) => {
                emailData += chunk.toString('utf8');
              });
            });

            msg.on('end', async () => {
              try {
                const parsed = await simpleParser(emailData);
                
                emails.push({
                  from: parsed.from?.text || '',
                  subject: parsed.subject || '',
                  body: parsed.text || '',
                  messageId: parsed.messageId || '',
                });

                processed++;
                if (processed === results.length) {
                  resolve(emails);
                }
              } catch (parseErr) {
                console.error('Error parsing email:', parseErr);
                processed++;
                if (processed === results.length) {
                  resolve(emails);
                }
              }
            });
          });

          fetch.once('error', (fetchErr: Error) => {
            reject(fetchErr);
          });

          fetch.once('end', () => {
            if (processed === 0) {
              resolve([]);
            }
          });
        });
      });
    });
  }

  async sendEmailWithAttachment(to: string, subject: string, body: string, attachmentPath?: string): Promise<void> {
    const mailOptions: any = {
      from: this.config.username,
      to,
      subject,
      text: body,
    };

    if (attachmentPath) {
      mailOptions.attachments = [{
        path: attachmentPath,
      }];
    }

    try {
      await this.smtpTransporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${to}`);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.smtpTransporter.verify();
      await this.connectImap();
      return true;
    } catch (error) {
      console.error('Email connection test failed:', error);
      return false;
    }
  }

  disconnect(): void {
    if (this.imapConnection) {
      this.imapConnection.end();
    }
  }
}
