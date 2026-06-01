import { ref } from 'vue';

const toasts = ref([]);
let nextId = 0;

export function useToast() {
    const add = (message, duration = 4000) => {
        const id = ++nextId;
        toasts.value.push({ id, message });
        setTimeout(() => remove(id), duration);
    };

    const remove = (id) => {
        toasts.value = toasts.value.filter(t => t.id !== id);
    };

    return { toasts, add, remove };
}
