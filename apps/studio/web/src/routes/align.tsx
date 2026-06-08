import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/align')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/align"!</div>
}
