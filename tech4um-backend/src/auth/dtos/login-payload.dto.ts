export class LoginPayloadDto {
  id: number;
  email: string;
  username: string;
  tokenType?: 'access' | 'refresh';
}
