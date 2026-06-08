import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/assay')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/assay"!</div>
}
