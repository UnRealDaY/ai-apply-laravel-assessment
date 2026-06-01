import { ref, computed } from 'vue';
import api from './useApi.js';

const token = ref(localStorage.getItem('token'));
const user = ref(localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null);

export function useAuth() {
    const isAuthenticated = computed(() => !!token.value);

    const setSession = (newToken, newUser) => {
        token.value = newToken;
        user.value = newUser;
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
    };

    const clearSession = () => {
        token.value = null;
        user.value = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    const login = async (credentials) => {
        const response = await api.post('/login', credentials);
        setSession(response.data.token, response.data.user);
        return response.data;
    };

    const register = async (data) => {
        const response = await api.post('/register', data);
        setSession(response.data.token, response.data.user);
        return response.data;
    };

    const logout = async () => {
        try {
            await api.post('/logout');
        } catch (e) {
            // Even if the server call fails, clear the local session
        } finally {
            clearSession();
        }
    };

    return {
        token,
        user,
        isAuthenticated,
        login,
        register,
        logout,
    };
}
