import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { EmailService } from '../email/email.service';

const mockUserService = {
  findByEmail: jest.fn(),
  findByEmailWithPassword: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  updateRefreshToken: jest.fn(),
  setEmailVerificationToken: jest.fn(),
  setPasswordResetToken: jest.fn(),
  findByResetToken: jest.fn(),
  resetPassword: jest.fn(),
  changePassword: jest.fn(),
  findOrCreateGoogleUser: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn().mockResolvedValue('mock-token'),
  verify: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      'google.clientId': 'mock-google-client-id',
      'jwt.secret': 'mock-jwt-secret',
    };
    return config[key];
  }),
};

const mockEmailService = {
  sendEmailVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    // Reset signAsync to default
    mockJwtService.signAsync.mockResolvedValue('mock-token');
  });

  describe('googleLogin()', () => {
    const mockGoogleUser = {
      id: 'user-id-1',
      name: 'Test User',
      email: 'test@example.com',
      authProviders: ['google'],
    };

    const mockPayload = {
      sub: 'google-sub-123',
      email: 'test@example.com',
      name: 'Test User',
    };

    beforeEach(() => {
      mockUserService.findOrCreateGoogleUser.mockResolvedValue(mockGoogleUser);
      mockUserService.updateRefreshToken.mockResolvedValue(undefined);
    });

    it('creates a new Google user and returns tokens + user', async () => {
      jest
        .spyOn(OAuth2Client.prototype, 'verifyIdToken')
        .mockResolvedValueOnce({
          getPayload: () => mockPayload,
        } as any);

      const result = await service.googleLogin('valid-id-token');

      expect(mockUserService.findOrCreateGoogleUser).toHaveBeenCalledWith(
        mockPayload.sub,
        mockPayload.email,
        mockPayload.name,
      );
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.authProviders).toEqual(['google']);
      expect(result.accessToken).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-token');
    });

    it('merges existing local user with Google account', async () => {
      const mergedUser = {
        ...mockGoogleUser,
        authProviders: ['local', 'google'],
      };
      mockUserService.findOrCreateGoogleUser.mockResolvedValueOnce(mergedUser);
      jest
        .spyOn(OAuth2Client.prototype, 'verifyIdToken')
        .mockResolvedValueOnce({
          getPayload: () => mockPayload,
        } as any);

      const result = await service.googleLogin('valid-id-token');

      expect(result.user.authProviders).toContain('local');
      expect(result.user.authProviders).toContain('google');
    });

    it('allows existing Google user to log in again without duplicate', async () => {
      jest
        .spyOn(OAuth2Client.prototype, 'verifyIdToken')
        .mockResolvedValueOnce({
          getPayload: () => mockPayload,
        } as any);

      const result = await service.googleLogin('valid-id-token');

      expect(mockUserService.findOrCreateGoogleUser).toHaveBeenCalledTimes(1);
      expect(result.user.id).toBe('user-id-1');
    });

    it('throws UnauthorizedException for invalid token', async () => {
      jest
        .spyOn(OAuth2Client.prototype, 'verifyIdToken')
        .mockRejectedValueOnce(new Error('Token expired'));

      await expect(service.googleLogin('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when token payload is missing sub', async () => {
      jest
        .spyOn(OAuth2Client.prototype, 'verifyIdToken')
        .mockResolvedValueOnce({
          getPayload: () => ({ email: 'test@example.com', sub: undefined }),
        } as any);

      await expect(service.googleLogin('token-no-sub')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when token payload is missing email', async () => {
      jest
        .spyOn(OAuth2Client.prototype, 'verifyIdToken')
        .mockResolvedValueOnce({
          getPayload: () => ({ sub: 'google-sub-123', email: undefined }),
        } as any);

      await expect(service.googleLogin('token-no-email')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('uses email as name fallback when name is missing from payload', async () => {
      const payloadWithoutName = { sub: 'google-sub-123', email: 'test@example.com' };
      jest
        .spyOn(OAuth2Client.prototype, 'verifyIdToken')
        .mockResolvedValueOnce({
          getPayload: () => payloadWithoutName,
        } as any);

      await service.googleLogin('valid-id-token');

      expect(mockUserService.findOrCreateGoogleUser).toHaveBeenCalledWith(
        'google-sub-123',
        'test@example.com',
        'test@example.com',
      );
    });
  });

  describe('resetPassword() — authProviders', () => {
    it("adds 'local' to authProviders for Google-only user (null authProviders)", async () => {
      const mockUser = {
        password: undefined,
        passwordResetToken: 'token',
        passwordResetExpires: new Date(),
        authProviders: null as any,
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockUserService.findByResetToken.mockResolvedValueOnce(mockUser);
      mockUserService.resetPassword.mockImplementationOnce(
        async (user: any, newPassword: string) => {
          user.password = newPassword;
          user.passwordResetToken = undefined;
          user.passwordResetExpires = undefined;
          if (!user.authProviders) user.authProviders = [];
          if (!user.authProviders.includes('local')) {
            user.authProviders.push('local');
          }
          await user.save();
        },
      );

      await service.resetPassword('valid-token', 'new-password');

      expect(mockUserService.resetPassword).toHaveBeenCalledWith(
        mockUser,
        'new-password',
      );
    });

    it("adds 'local' to authProviders for Google-only user (empty authProviders)", async () => {
      const mockUser = {
        password: undefined,
        passwordResetToken: 'token',
        passwordResetExpires: new Date(),
        authProviders: ['google'] as string[],
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockUserService.findByResetToken.mockResolvedValueOnce(mockUser);
      mockUserService.resetPassword.mockImplementationOnce(
        async (user: any, newPassword: string) => {
          user.password = newPassword;
          if (!user.authProviders) user.authProviders = [];
          if (!user.authProviders.includes('local')) {
            user.authProviders.push('local');
          }
          await user.save();
        },
      );

      await service.resetPassword('valid-token', 'new-password');

      expect(mockUserService.resetPassword).toHaveBeenCalled();
    });
  });

  describe('changePassword() — Google-only guard', () => {
    it('throws BadRequestException when user has no password', async () => {
      const mockUser = { id: 'user-id', email: 'test@example.com' };
      const mockUserWithNoPassword = {
        ...mockUser,
        password: undefined,
      };
      mockUserService.findById.mockResolvedValueOnce(mockUser);
      mockUserService.findByEmailWithPassword.mockResolvedValueOnce(
        mockUserWithNoPassword,
      );

      await expect(
        service.changePassword('user-id', 'current-pass', 'new-pass'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
