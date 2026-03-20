export const getBackendRoot = () => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    return apiBase.replace('/api', '');
};

export const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const root = getBackendRoot();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${root}${cleanPath}`;
};

export const getAIImageUrl = (filename) => {
    if (!filename) return '';
    const root = getBackendRoot();
    return `${root}/outputs/${filename}`;
};
