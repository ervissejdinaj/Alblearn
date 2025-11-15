import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
} from "react";
import { User, AuthState } from "../types";
import { authApi } from "../services/alblearnApi";
import { setAuthToken, clearAuthToken } from "../services/apiClient";
import { ApiUser, AuthResponse } from "../types/api";
import { ApiError } from "../services/apiClient";
import { mapApiUserToUser } from "../utils/user";

interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  signup: (payload: {
    name: string;
    email: string;
    password: string;
    passwordConfirmation: string;
  }) => Promise<boolean>;
}

type AuthAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "LOGIN_SUCCESS"; payload: { user: User; token: string } }
  | { type: "LOGIN_FAILURE" }
  | { type: "LOGOUT" };

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "LOGIN_SUCCESS":
      return {
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    case "LOGIN_FAILURE":
      return { ...initialState, isLoading: false };
    case "LOGOUT":
      return { ...initialState, isLoading: false };
    default:
      return state;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const persistSession = (token: string, apiUser: ApiUser) => {
  window.localStorage.setItem("token", token);
  window.localStorage.setItem("api_user", JSON.stringify(apiUser));
};

const clearSession = () => {
  window.localStorage.removeItem("token");
  window.localStorage.removeItem("api_user");
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const handleAuthSuccess = useCallback(
    (payload: AuthResponse) => {
      const mappedUser = mapApiUserToUser(payload.user);
      setAuthToken(payload.token);
      persistSession(payload.token, payload.user);
      dispatch({
        type: "LOGIN_SUCCESS",
        payload: { user: mappedUser, token: payload.token },
      });
    },
    []
  );

  const restoreSession = useCallback(async () => {
    const storedToken = window.localStorage.getItem("token");

    if (!storedToken) {
      dispatch({ type: "SET_LOADING", payload: false });
      return;
    }

    setAuthToken(storedToken);
    dispatch({ type: "SET_LOADING", payload: true });

    try {
      const response = await authApi.me();
      const apiUser = response.data;
      const mappedUser = mapApiUserToUser(apiUser);
      persistSession(storedToken, apiUser);
      dispatch({
        type: "LOGIN_SUCCESS",
        payload: { user: mappedUser, token: storedToken },
      });
    } catch (error) {
      clearSession();
      clearAuthToken();
      dispatch({ type: "LOGOUT" });
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = useCallback(async (email: string, password: string) => {
    dispatch({ type: "SET_LOADING", payload: true });

    try {
      const response = await authApi.login({ email, password });
      handleAuthSuccess(response.data);
      return true;
    } catch (error) {
      dispatch({ type: "LOGIN_FAILURE" });
      if (error instanceof ApiError) {
        return false;
      }
      return false;
    }
  }, [handleAuthSuccess]);

  const signup = useCallback(
    async ({ name, email, password, passwordConfirmation }: {
      name: string;
      email: string;
      password: string;
      passwordConfirmation: string;
    }) => {
      dispatch({ type: "SET_LOADING", payload: true });

      try {
        const response = await authApi.register({
          name,
          email,
          password,
          password_confirmation: passwordConfirmation,
        });
        handleAuthSuccess(response.data);
        return true;
      } catch (error) {
        dispatch({ type: "LOGIN_FAILURE" });
        return false;
      }
    },
    [handleAuthSuccess]
  );

  const logout = useCallback(async () => {
    dispatch({ type: "SET_LOADING", payload: true });

    try {
      await authApi.logout();
    } catch (error) {
      // Ignore logout errors; we'll clear the session locally regardless.
    } finally {
      clearSession();
      clearAuthToken();
      dispatch({ type: "LOGOUT" });
    }
  }, []);

  const value: AuthContextType = {
    state,
    login,
    logout,
    signup,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
