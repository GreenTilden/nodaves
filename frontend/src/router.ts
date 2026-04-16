import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', component: () => import('./pages/HomePage.vue') },
  { path: '/city/:slug', component: () => import('./pages/CityPage.vue') },
  { path: '/bar/:id', component: () => import('./pages/BarPage.vue') },
  { path: '/teams', component: () => import('./pages/TeamsPage.vue') },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
