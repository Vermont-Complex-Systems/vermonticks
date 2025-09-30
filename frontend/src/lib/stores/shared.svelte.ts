interface SidebarSelections {
    activity: string;
    vector: string;
    pathogen: string;
    model: string;
}

// Sidebar state - tracks user selections
export const sidebarState = $state<SidebarSelections>({
    activity: 'hiking',
    vector: 'blacklegged-tick',
    pathogen: 'lyme',
    model: 'autoregressive'
});

// UI state - tracks viewport/display mode
export const uiState = $state({
    isMobile: false
});


// Actions for updating sidebar selections
export function updateActivity(activity: string) {
    sidebarState.activity = activity;
}

export function updateVector(vector: string) {
    sidebarState.vector = vector;
}

export function updatePathogen(pathogen: string) {
    sidebarState.pathogen = pathogen;
}

export function updateModel(model: string) {
    sidebarState.model = model;
}

// UI actions
export function updateMobileState(isMobile: boolean) {
    uiState.isMobile = isMobile;
}

// Initialize mobile state tracking - call this once in your app
export function initializeMobileTracking() {
    if (typeof window !== 'undefined') {
        import('svelte/reactivity/window').then(({ innerWidth }) => {
            $effect(() => {
                if (innerWidth.current) {
                    updateMobileState(innerWidth.current < 640);
                }
            });
        });
    }
}

// Computed state that other components can react to
export function getCurrentSelections() {
    return {
        activity: sidebarState.activity,
        vector: sidebarState.vector,
        pathogen: sidebarState.pathogen,
        model: sidebarState.model
    };
}