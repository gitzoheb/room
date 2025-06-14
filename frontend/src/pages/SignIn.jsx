import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import useUserStore from '../store/useUserStore';
import { LogIn, User, ArrowRight, UserPlus } from 'lucide-react';

const SignIn = () => {
  const [username, setUsername] = useState('');

  const users = useUserStore((state) => state.users);
  const fetchUsers = useUserStore((state) => state.fetchUsers);
  const setCurrentUser = useUserStore((state) => state.setCurrentUser);
  const currentUser = useUserStore((state) => state.currentUser);

  const navigate = useNavigate();

  // 🔄 Auto-redirect if user already logged in
  useEffect(() => {
    if (currentUser) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSignIn = (e) => {
    e.preventDefault();

    if (!username.trim()) {
      toast.error('Please enter a username');
      return;
    }

    const found = users.find((u) => u.username === username);

    if (found) {
      setCurrentUser(found);
      toast.success('Signed in successfully!');
      navigate('/');
    } else {
      toast.error('User not found!');
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center overflow-hidden relative p-4">
      {/* Decorative blobs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-200/30 blur-3xl rounded-full" />
      <div className="absolute -bottom-24 -right-24 w-[28rem] h-[28rem] bg-blue-100/30 blur-3xl rounded-full" />
      <div className="relative z-10 w-full max-w-xl">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-blue-100 p-8 transition-all duration-300">
          {/* Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mb-5 shadow-lg">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800">Welcome Back</h2>
            <p className="text-gray-500 mt-1 text-sm">Sign in to your account</p>
          </div>

          <form onSubmit={handleSignIn} className="space-y-6">
            {/* Username Field */}
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-gray-700 font-medium text-sm">
                <User size={14} /> Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm transition-all duration-200"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-200"
            >
              Sign In <ArrowRight className="w-4 h-4" />
            </button>

            {/* Create Account Link */}
            <div className="text-center pt-2">
              <p className="text-gray-700 text-sm">
                Don't have an account?{' '}
                <Link
                  to="/create-user"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-500 font-medium transition-colors duration-200"
                >
                  <UserPlus size={14} /> Create Account
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignIn;