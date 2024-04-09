import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    pages:{
        signIn: '/login'
    },
    callbacks:{
        authorized({ auth, request: { nextUrl } }) {
            // auth contain user's sessions  and request contain incoming request.
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
            if(isOnDashboard){
                if(isLoggedIn) return true;
                return false;  //redirect unauthenticate user to login page
            } else if(isLoggedIn) {
                return Response.redirect(new URL('/dashboard', nextUrl))
            }
            return true;
        },
    },
    providers: [],   //here you can provide various login options. for now its empty
} satisfies NextAuthConfig;