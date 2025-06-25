import { ssrTrpc } from "../../../backend/trpc/ssr-caller"
import { ClientTrpc } from "../_components/ClientTrpc"

export default async function authPage(){

    const data = await ssrTrpc.sampleProtectedRoute()
    return (
        <div>
            <pre>
                {JSON.stringify(data, null, 2)}
            </pre>
            <ClientTrpc />
        </div>
    )
}