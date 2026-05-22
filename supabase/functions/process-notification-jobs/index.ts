Deno.serve(
  () =>
    new Response(
      JSON.stringify({
        ok: false,
        error: 'process-notification-jobs is deprecated',
        replacement: 'send-daily-reminders and check-push-receipts',
      }),
      {
        status: 410,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
);
