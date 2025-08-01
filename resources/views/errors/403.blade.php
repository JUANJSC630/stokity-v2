<!DOCTYPE html>
<html lang="es" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Acceso Denegado - Stokity</title>
    <script>
        // Detectar preferencia de tema del sistema
        if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    </script>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
                    },
                }
            }
        }
    </script>
</head>
<body class="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-4 font-sans">
    <div class="text-center max-w-md w-full">
        <!-- Error Code and Message -->
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <h1 class="text-6xl sm:text-8xl md:text-9xl font-bold text-gray-300 dark:text-gray-600">403</h1>
            <div class="hidden sm:block w-px h-16 bg-gray-300 dark:bg-gray-600"></div>
            <div class="text-center sm:text-left">
                <p class="text-gray-400 dark:text-gray-500 text-base sm:text-lg md:text-xl font-medium leading-relaxed">
                    {{ $exception->getMessage() ?: 'NO TIENES PERMISOS PARA ESTAR AQUÍ.' }}
                </p>
            </div>
        </div>
        
        <!-- Carita triste -->
        <div class="text-4xl sm:text-6xl md:text-8xl mb-8">😢</div>
        
        <!-- Botones de navegación -->
        <div class="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <a href="{{ url()->previous() }}" 
               class="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                </svg>
                Regresar
            </a>
            <a href="{{ route('dashboard') }}" 
               class="inline-flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                </svg>
                Dashboard
            </a>
        </div>
    </div>
</body>
</html> 