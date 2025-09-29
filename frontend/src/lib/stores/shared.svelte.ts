// Sidebar state - tracks user selections
export const sidebarState = $state<SidebarSelections>({
    activity: 'hiking',
    vector: 'blacklegged-tick',
    pathogen: 'lyme',
    model: 'autoregressive'
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

// Computed state that other components can react to
export function getCurrentSelections() {
    return {
        activity: sidebarState.activity,
        vector: sidebarState.vector,
        pathogen: sidebarState.pathogen,
        model: sidebarState.model
    };
}