import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePrivateAccess } from '@/hooks/usePrivateAccess';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, Wallet, ArrowRight, ArrowLeft, Mail } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

type AuthView = 'login' | 'signup' | 'forgot-password' | 'reset-sent';

export default function Auth() {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  
  const { signIn, signUp, user, loading } = useAuth();
  const { isPrivateAccessEnabled, isLoading: isPrivateAccessLoading } = usePrivateAccess();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  // Redirect to login view if private access is enabled and user tries to access signup
  useEffect(() => {
    if (!isPrivateAccessLoading && isPrivateAccessEnabled && view === 'signup') {
      setView('login');
    }
  }, [isPrivateAccessEnabled, isPrivateAccessLoading, view]);

  const validateForm = (checkPassword = true) => {
    const newErrors: { email?: string; password?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    if (checkPassword) {
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        newErrors.password = passwordResult.error.errors[0].message;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      if (view === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Invalid email or password. Please try again.');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Welcome back!');
          navigate('/');
        }
      } else if (view === 'signup') {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('This email is already registered. Please sign in instead.');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Account created successfully!');
          navigate('/');
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm(false)) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });
      
      if (error) {
        toast.error(error.message);
      } else {
        setView('reset-sent');
        toast.success('Password reset email sent!');
      }
    } catch (error) {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setErrors({});
  };

  // Show loading state while fetching auth or private access status
  if (loading || isPrivateAccessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-primary/5 to-background">
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          {/* Logo */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-emerald-400 shadow-xl shadow-primary/30 mb-6">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">JB-Manager</h1>
            <p className="text-muted-foreground mt-1">Commission Tracker</p>
          </div>
          
          {/* Card */}
          <Card className="border-0 shadow-xl shadow-black/5">
            {/* Login View */}
            {view === 'login' && (
              <>
                <CardHeader className="space-y-1 pb-4">
                  <CardTitle className="text-xl text-center">Welcome back</CardTitle>
                  <CardDescription className="text-center">
                    Sign in to manage your businesses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errors.email) setErrors({ ...errors, email: undefined });
                        }}
                        disabled={isSubmitting}
                        className={`h-12 rounded-xl ${errors.email ? 'border-destructive' : ''}`}
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <button
                          type="button"
                          onClick={() => {
                            setView('forgot-password');
                            setErrors({});
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (errors.password) setErrors({ ...errors, password: undefined });
                          }}
                          disabled={isSubmitting}
                          className={`h-12 rounded-xl ${errors.password ? 'border-destructive pr-10' : 'pr-10'}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="text-sm text-destructive">{errors.password}</p>
                      )}
                    </div>
                    
                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl text-base font-medium"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        'Signing in...'
                      ) : (
                        <>
                          Sign In
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </form>
                  
                  {/* Hide signup link when private access is enabled */}
                  {!isPrivateAccessEnabled && (
                    <div className="mt-6 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setView('signup');
                          resetForm();
                        }}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        Don&apos;t have an account? Sign up
                      </button>
                    </div>
                  )}
                </CardContent>
              </>
            )}

            {/* Signup View */}
            {view === 'signup' && (
              <>
                <CardHeader className="space-y-1 pb-4">
                  <CardTitle className="text-xl text-center">Create account</CardTitle>
                  <CardDescription className="text-center">
                    Get started with JB-Manager
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        disabled={isSubmitting}
                        className="h-12 rounded-xl"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errors.email) setErrors({ ...errors, email: undefined });
                        }}
                        disabled={isSubmitting}
                        className={`h-12 rounded-xl ${errors.email ? 'border-destructive' : ''}`}
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (errors.password) setErrors({ ...errors, password: undefined });
                          }}
                          disabled={isSubmitting}
                          className={`h-12 rounded-xl ${errors.password ? 'border-destructive pr-10' : 'pr-10'}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="text-sm text-destructive">{errors.password}</p>
                      )}
                    </div>
                    
                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl text-base font-medium"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        'Creating account...'
                      ) : (
                        <>
                          Create Account
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </form>
                  
                  <div className="mt-6 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setView('login');
                        resetForm();
                      }}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      Already have an account? Sign in
                    </button>
                  </div>
                </CardContent>
              </>
            )}

            {/* Forgot Password View */}
            {view === 'forgot-password' && (
              <>
                <CardHeader className="space-y-1 pb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setView('login');
                      resetForm();
                    }}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to login
                  </button>
                  <CardTitle className="text-xl">Reset password</CardTitle>
                  <CardDescription>
                    Enter your email and we&apos;ll send you a link to reset your password
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errors.email) setErrors({ ...errors, email: undefined });
                        }}
                        disabled={isSubmitting}
                        className={`h-12 rounded-xl ${errors.email ? 'border-destructive' : ''}`}
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email}</p>
                      )}
                    </div>
                    
                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl text-base font-medium"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        'Sending...'
                      ) : (
                        <>
                          <Mail className="w-4 h-4 mr-2" />
                          Send Reset Link
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </>
            )}

            {/* Reset Email Sent View */}
            {view === 'reset-sent' && (
              <>
                <CardHeader className="space-y-1 pb-4">
                  <div className="w-14 h-14 rounded-2xl bg-success/10 mx-auto mb-4 flex items-center justify-center">
                    <Mail className="w-7 h-7 text-success" />
                  </div>
                  <CardTitle className="text-xl text-center">Check your email</CardTitle>
                  <CardDescription className="text-center">
                    We sent a password reset link to <span className="font-medium text-foreground">{email}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground text-center">
                      Click the link in the email to reset your password. If you don&apos;t see it, check your spam folder.
                    </p>
                    
                    <Button
                      variant="outline"
                      className="w-full h-12 rounded-xl"
                      onClick={() => {
                        setView('login');
                        resetForm();
                      }}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to login
                    </Button>
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </div>
      
      {/* Footer */}
      <div className="p-6 text-center">
        <p className="text-xs text-muted-foreground">
          Manage your business commissions with ease
        </p>
      </div>
    </div>
  );
}
