import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth.tsx";

interface SimpleAuthProps {
  defaultMode?: 'signin' | 'signup';
  onSuccess?: () => void;
}

export default function SimpleAuth({ defaultMode = 'signin', onSuccess }: SimpleAuthProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);
  const [, setLocation] = useLocation();
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Sign In form state
  const [signInData, setSignInData] = useState({
    username: "",
    password: ""
  });

  // Sign Up form state
  const [signUpData, setSignUpData] = useState({
    name: "",
    username: "",
    password: "",
    profilePicture: null as File | null
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInData.username || !signInData.password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await signIn(signInData);
      toast({
        title: "Welcome back!",
        description: "You have been signed in successfully.",
      });
      onSuccess?.();
      setLocation('/');
    } catch (error: any) {
      toast({
        title: "Sign In Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpData.name || !signUpData.username || !signUpData.password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!signUpData.profilePicture) {
      toast({
        title: "Profile Picture Required",
        description: "Please upload a profile picture to continue",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await signUp({
        name: signUpData.name,
        username: signUpData.username,
        password: signUpData.password
      }, signUpData.profilePicture);
      
      toast({
        title: "Account Created!",
        description: "Welcome to PinShare!",
      });
      onSuccess?.();
      setLocation('/');
    } catch (error: any) {
      toast({
        title: "Sign Up Failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-pinterest-red">
            {mode === 'signin' ? 'Welcome Back' : 'Join Share'}
          </CardTitle>
          <p className="text-muted-foreground">
            {mode === 'signin' ? 'Sign in to your account' : 'Create your account to get started'}
          </p>
        </CardHeader>
        <CardContent>
          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <Label htmlFor="signin-username">Username</Label>
                <Input
                  id="signin-username"
                  type="text"
                  placeholder="Enter your username"
                  className="focus:ring-2 focus:ring-pinterest-red focus:border-transparent"
                  value={signInData.username}
                  onChange={(e) => setSignInData(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="Enter your password"
                  className="focus:ring-2 focus:ring-pinterest-red focus:border-transparent"
                  value={signInData.password}
                  onChange={(e) => setSignInData(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-pinterest-red text-white hover:bg-red-700"
                disabled={isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <Label htmlFor="signup-name">Full Name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Enter your full name"
                  className="focus:ring-2 focus:ring-pinterest-red focus:border-transparent"
                  value={signUpData.name}
                  onChange={(e) => setSignUpData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="signup-username">Username</Label>
                <Input
                  id="signup-username"
                  type="text"
                  placeholder="Choose a username"
                  className="focus:ring-2 focus:ring-pinterest-red focus:border-transparent"
                  value={signUpData.username}
                  onChange={(e) => setSignUpData(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Create a password"
                  className="focus:ring-2 focus:ring-pinterest-red focus:border-transparent"
                  value={signUpData.password}
                  onChange={(e) => setSignUpData(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="signup-profile">Profile Picture *</Label>
                <Input
                  id="signup-profile"
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                  className="focus:ring-2 focus:ring-pinterest-red focus:border-transparent"
                  onChange={(e) => setSignUpData(prev => ({ 
                    ...prev, 
                    profilePicture: e.target.files ? e.target.files[0] : null 
                  }))}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">PNG, JPEG, or GIF up to 1MB (required)</p>
              </div>
              <Button
                type="submit"
                className="w-full bg-pinterest-red text-white hover:bg-red-700"
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-pinterest-gray">
              {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                className="text-pinterest-red hover:text-red-700 font-medium"
              >
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}