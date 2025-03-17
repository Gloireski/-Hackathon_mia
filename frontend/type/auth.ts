export interface LoginResponse {
    login: {
        id: string
        username: string
        token: string
    }
}

export interface LoginVariables {
    email: string
    password: string
}
