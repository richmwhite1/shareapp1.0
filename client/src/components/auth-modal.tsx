import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth.tsx";
import { signInSchema, signUpSchema, type SignInData, type SignUpData } from "@shared/schema";

interface AuthModalProps {
  defaultMode?: 'signin' | 'signup';
  onSuccess?: () => void;
}

export default function AuthModal({ defaultMode = 'signin', onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);
  const [, setLocation] = useLocation();
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const signInForm = useForm<SignInData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      username: "",
      password: "",
    },
    mode: "onChange",
  });

  const signUpForm = useForm<SignUpData & { profilePicture?: FileList }>({
    defaultValues: {
      username: "",
      password: "",
      name: "",
    },
  });

  const handleSignIn = async (data: SignInData) => {
    try {
      await signIn(data);
      toast({
        title: "Welcome back!",
        description: "You have been signed in successfully.",
      });
      onSuccess?.();
      setLocation('/');
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    }
  };

  const handleSignUp = async (data: SignUpData & { profilePicture?: FileList }) => {
    try {
      const profilePicture = data.profilePicture?.[0];
      if (!profilePicture) {
        toast({
          title: "Profile Picture Required",
          description: "Please upload a profile picture to continue",
          variant: "destructive",
        });
        return;
      }
      
      await signUp({
        username: data.username,
        password: data.password,
        name: data.name,
      }, profilePicture);
      toast({
        title: "Account created!",
        description: "Welcome to Share! You are now signed in.",
      });
      onSuccess?.();
      setLocation('/');
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-gray p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
            {mode === 'signin' ? 'Welcome Back' : 'Join Share'}
          </CardTitle>
          <p className="text-pinterest-gray">
            {mode === 'signin' 
              ? 'Sign in to comment and share your thoughts'
              : 'Create an account to start sharing amazing posts'
            }
          </p>
        </CardHeader>

        <CardContent>
          {mode === 'signin' ? (
            <Form {...signInForm}>
              <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                <FormField
                  control={signInForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your username"
                          className="focus:ring-2 focus:ring-pinterest-red focus:border-transparent"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signInForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          className="focus:ring-2 focus:ring-pinterest-red focus:border-transparent"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full bg-pinterest-red text-white hover:bg-red-700"
                  disabled={signInForm.formState.isSubmitting}
                >
                  {signInForm.formState.isSubmitting ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
            </Form>
          ) : (
            <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  className="focus:ring-2 focus:ring-pinterest-red focus:border-transparent"
                  {...signUpForm.register("name", { required: true })}
                />
              </div>
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Choose a username"
                  className="focus:ring-2 focus:ring-pinterest-red focus:border-transparent"
                  {...signUpForm.register("username", { required: true })}
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  className="focus:ring-2 focus:ring-pinterest-red focus:border-transparent"
                  {...signUpForm.register("password", { required: true })}
                />
              </div>
              <div>
                <Label htmlFor="profilePicture">Profile Picture *</Label>
                <Input
                  id="profilePicture"
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  className="focus:ring-2 focus:ring-pinterest-red focus:border-transparent"
                  {...signUpForm.register("profilePicture", { required: "Profile picture is required" })}
                />
                <p className="text-xs text-gray-500">JPEG or PNG, max 1MB (required)</p>
              </div>
              <Button
                type="submit"
                className="w-full bg-pinterest-red text-white hover:bg-red-700"
                disabled={signUpForm.formState.isSubmitting}
              >
                {signUpForm.formState.isSubmitting ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-pinterest-gray">
              {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
              <button
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
