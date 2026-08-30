    export default function Button({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    className = '', 
    ...props 
    }) {
        
    const variants = {
        primary: 'bg-fox-pink hover:bg-fox-pink-dark text-white shadow-fox',
        secondary: 'bg-white hover:bg-gray-50 text-fox-pink border-2 border-fox-pink',
        outline: 'bg-transparent hover:bg-fox-pink hover:text-white text-fox-pink border-2 border-fox-pink',
        ghost: 'bg-transparent hover:bg-fox-pink/10 text-fox-pink',
    };

    const sizes = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
    };

    return (
        <button
        className={`
            ${variants[variant]} 
            ${sizes[size]} 
            rounded-xl font-semibold transition-all duration-300 
            disabled:opacity-50 disabled:cursor-not-allowed
            ${className}
        `}
        {...props}
        >
        {children}
        </button>
    );
    }