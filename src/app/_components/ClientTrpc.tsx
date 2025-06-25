'use client';

import { trpc } from "../../../utils/providers/TrpcProviders";

export const ClientTrpc =()=> {

    const {data,isPending,isSuccess} = trpc.sampleProcedure.useQuery();

    if( isPending ){
        return <div>Loading...</div>
    }

    return (
        <div>
        <pre>
            {JSON.stringify(data, null, 2)}
        </pre>
        Client trpc component
        <span className="text-green-500">{isSuccess? "success":"failure"}</span>
        </div>
    )
}