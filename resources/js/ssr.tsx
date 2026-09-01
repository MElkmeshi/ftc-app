import { createInertiaApp } from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ReactDOMServer from 'react-dom/server';
import { type RouteName, route } from 'ziggy-js';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createServer((page) =>
    createInertiaApp({
        page,
        render: ReactDOMServer.renderToString,
        title: (title) => `${title} - ${appName}`,
        // @ts-expect-error -- @inertiajs/react's beta SSR types don't resolve this generic overload correctly.
        setup: ({ App, props }) => {
            /* eslint-disable */
            // @ts-expect-error
            global.route<RouteName> = (name, params, absolute) =>
                route(name, params as any, absolute, {
                    // @ts-expect-error
                    ...page.props.ziggy,
                    // @ts-expect-error
                    location: new URL(page.props.ziggy.location),
                });
            /* eslint-enable */

            const queryClient = new QueryClient();

            return (
                <QueryClientProvider client={queryClient}>
                    <App {...props} />
                </QueryClientProvider>
            );
        },
    }),
);
