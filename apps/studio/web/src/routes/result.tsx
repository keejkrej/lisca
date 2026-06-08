import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/result')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/result"!</div>
}
