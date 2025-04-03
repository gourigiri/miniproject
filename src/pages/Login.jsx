import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

// Updated with Render URLs
const STANDARD_API_URL = "https://miniproject-standard1.onrender.com"; // Replace with actual Render URL for miniproject_standard1.py
const PERSONAL_API_URL = "https://miniproject-personal.onrender.com"; // Confirmed Render URL for miniproject_personal.py

const Login = ({ setIsLoggedIn }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        if (!email || !password) {
            setError("Both fields are required.");
            setLoading(false);
            return;
        }

        try {
            console.log("Attempting user login...");
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

            if (authError) throw new Error(authError.message || "Invalid login credentials.");

            const auth_uid = authData.user?.id;
            if (!auth_uid) throw new Error("Authentication failed. No user ID returned.");

            console.log("User logged in with auth UID:", auth_uid);
            localStorage.setItem("auth_uid", auth_uid);

            console.log("Fetching user from UserTable...");
            const { data: userData, error: userError } = await supabase
                .from("UserTable")
                .select("*")
                .eq("auth_uid", auth_uid)
                .single();

            if (userError) {
                console.error("Error fetching user:", userError.message);
                throw new Error("User not found in database.");
            }

            console.log("User data retrieved:", userData);
            localStorage.setItem("user", JSON.stringify(userData));
            if (setIsLoggedIn) setIsLoggedIn(true);

            // Send request to standard recommendations backend
            console.log("Sending request to standard recommendations backend...");
            const standardResponse = await fetch(`${STANDARD_API_URL}/api/generate-recommendations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: auth_uid, num_meals: 3 }),
            });

            if (!standardResponse.ok) {
                const errorData = await standardResponse.json();
                console.error("Standard backend error:", errorData);
                throw new Error(errorData.error || "Failed to generate standard recommendations");
            }
            console.log("Standard recommendations generated successfully");

            // Send request to personalized recommendations backend
            console.log("Sending request to personalized recommendations backend...");
            const personalResponse = await fetch(`${PERSONAL_API_URL}/api/generate-personalized-recommendations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: auth_uid, num_meals: 3 }),
            });

            if (!personalResponse.ok) {
                const errorData = await personalResponse.json();
                console.error("Personal backend error:", errorData);
                throw new Error(errorData.error || "Failed to generate personalized recommendations");
            }
            console.log("Personalized recommendations generated successfully");

            console.log("Navigating to home...");
            navigate("/home");
        } catch (err) {
            console.error("Login error:", err.message);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-blue-500 to-purple-600">
            <div className="bg-white p-8 rounded-2xl shadow-lg w-96">
                <h2 className="text-2xl font-bold text-center text-gray-800">Login</h2>
                {error && <p className="text-red-500 text-center mt-2">{error}</p>}
                <form onSubmit={handleLogin} className="mt-4">
                    <input
                        type="email"
                        placeholder="Email"
                        className="w-full p-2 border rounded-lg mb-3"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        className="w-full p-2 border rounded-lg mb-3"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        className="w-full text-white p-2 rounded-lg bg-blue-500 hover:bg-blue-700"
                        disabled={loading}
                    >
                        {loading ? "Signing In..." : "Sign In"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;