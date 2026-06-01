import { createRouter, createWebHistory } from 'vue-router';
import Login from '../pages/Login.vue';
import Register from '../pages/Register.vue';
import TaskList from '../pages/TaskList.vue';
import TaskCreate from '../pages/TaskCreate.vue';
import TaskShow from '../pages/TaskShow.vue';
import TaskEdit from '../pages/TaskEdit.vue';

const routes = [
    {
        path: '/',
        name: 'TaskList',
        component: TaskList,
        meta: { auth: true },
    },
    {
        path: '/login',
        name: 'Login',
        component: Login,
        meta: { guest: true },
    },
    {
        path: '/register',
        name: 'Register',
        component: Register,
        meta: { guest: true },
    },
    {
        path: '/tasks/create',
        name: 'TaskCreate',
        component: TaskCreate,
        meta: { auth: true },
    },
    {
        path: '/tasks/:id',
        name: 'TaskShow',
        component: TaskShow,
        meta: { auth: true },
    },
    {
        path: '/tasks/:id/edit',
        name: 'TaskEdit',
        component: TaskEdit,
        meta: { auth: true },
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

router.beforeEach((to, from, next) => {
    const isAuthenticated = !!localStorage.getItem('token');

    if (to.meta.auth && !isAuthenticated) {
        next({ name: 'Login' });
    } else if (to.meta.guest && isAuthenticated) {
        next({ name: 'TaskList' });
    } else {
        next();
    }
});

export default router;
