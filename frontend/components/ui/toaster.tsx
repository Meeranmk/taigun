'use client';

import { useEffect, useState } from 'react';
import {
    Toast,
    ToastClose,
    ToastDescription,
    ToastProvider,
    ToastTitle,
    ToastViewport,
} from '@/components/ui/toast';
import { useUIStore } from '@/lib/store/uiStore';

export function Toaster() {
    const { toasts, removeToast } = useUIStore();

    return (
        <ToastProvider>
            {toasts.map(({ id, title, message, type }) => (
                <Toast key={id} variant={type === 'error' ? 'destructive' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'default'}>
                    <div className="grid gap-1">
                        {title && <ToastTitle>{title}</ToastTitle>}
                        {message && <ToastDescription>{message}</ToastDescription>}
                    </div>
                    <ToastClose onClick={() => removeToast(id)} />
                </Toast>
            ))}
            <ToastViewport />
        </ToastProvider>
    );
}
