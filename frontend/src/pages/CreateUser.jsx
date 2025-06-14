import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import useUserStore from "../store/useUserStore";
import toast from "react-hot-toast";
import { User, UserPlus, Edit3, Loader2, Check, LogIn } from 'lucide-react';

const CreateUser = () => {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const createNewUser = useUserStore((state) => state.createNewUser);
  const currentUser = useUserStore((state) => state.currentUser);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate("/", { replace: true });
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !username) {
      toast.error("Both name and username are required");
      return;
    }

    try {
      setLoading(true);
      await createNewUser({ name, username });
      toast.success("User created successfully!");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err.message); // Show backend error like "username already exists"
    } finally {
      setLoading(false);
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
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800">Create Account</h2>
            <p className="text-gray-500 mt-1 text-sm">Join us and get started</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Field */}
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-gray-700 font-medium text-sm">
                <Edit3 size={14} /> Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm transition-all duration-200"
              />
            </div>

            {/* Username Field */}
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-gray-700 font-medium text-sm">
                <User size={14} /> Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a unique username"
                className="w-full px-4 py-3 rounded-lg bg-white border border-gray-300 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm transition-all duration-200"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:hover:shadow-none"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" /> Creating Account...
                </>
              ) : (
                <>
                  Create Account <Check className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Sign In Link */}
            <div className="text-center pt-2">
              <p className="text-gray-700 text-sm">
                Already have an account?{' '}
                <Link
                  to="/sign-in"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-500 font-medium transition-colors duration-200"
                >
                  <LogIn size={14} /> Sign In
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateUser;