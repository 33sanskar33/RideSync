import LegalPageLayout from '@/components/LegalPageLayout';

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" updatedAt="2 November 2026">
      <section>
        <h2 className="text-base font-bold text-charcoal">1. About this policy</h2>
        <p>
          This draft explains how RideSync handles information when you create an account, join a ride room
          or use its group-riding features. RideSync is designed to help motorcycle groups coordinate with
          one another. It is not an emergency-response service.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-charcoal">2. Information you provide</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Account information, such as your email address and the name you provide.</li>
          <li>Optional profile information, such as your phone number.</li>
          <li>Ride information, such as room name, room code, destination, rider display names and ride status.</li>
          <li>Group chat messages and quick messages sent inside a ride room.</li>
          <li>Emergency alert details you choose to submit, including your rider name, message and location coordinates.</li>
          <li>Push-notification subscription details, when you enable notifications in a supported browser.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-bold text-charcoal">3. Location information</h2>
        <p>
          RideSync uses your device's location permission to obtain GPS coordinates for live rider sharing
          while you use a ride room. Your location may be shared with other participants in that room and
          saved as the latest rider location so the group map can update. If you send an SOS alert, the
          coordinates available at that time are included with the alert.
        </p>
        <p>
          You can deny or revoke location permission in your browser or device settings. Location-dependent
          features will not work correctly without permission. Leaving a ride room or closing the app may
          stop active location updates, but previously submitted or stored ride data may remain.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-charcoal">4. How information is used</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>To create and secure accounts and authenticate members.</li>
          <li>To create ride rooms, show participants and share live ride information.</li>
          <li>To provide group chat, ride history, statistics and account preferences.</li>
          <li>To deliver SOS push notifications to other subscribed members of the same ride, where supported.</li>
          <li>To maintain, troubleshoot and protect the service against misuse.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-bold text-charcoal">5. Who can see your information</h2>
        <p>
          Other members of a ride may see ride details, rider display names, shared locations, chat messages
          and SOS alerts made available to that ride. Do not join a room or share information unless you are
          comfortable sharing it with its participants. RideSync uses Supabase for authentication, database
          and realtime functionality. Map tiles and routing features may also involve third-party map
          services; those services may receive technical information such as your IP address and the
          coordinates needed to display a map or calculate a route.
        </p>
        <p>
          RideSync does not intentionally make private account credentials or server-side secret keys
          available to other riders. Never share your password or a private access token.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-charcoal">6. Notifications</h2>
        <p>
          If you enable browser push notifications, RideSync stores a push subscription so that supported
          browsers can receive ride SOS alerts. You can disable notifications through your browser or device
          settings. Delivery depends on browser, device, network and notification permissions; it is not
          guaranteed.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-charcoal">7. Storage, retention and account deletion</h2>
        <p>
          RideSync stores account and ride information using its backend service provider. You can request
          permanent account deletion from Settings. The deletion process removes your authentication account,
          profile metadata, push subscriptions, personal GPS records, memberships and account-linked chat
          and SOS records.
        </p>
        <p>
          To avoid removing other riders' group history, rooms created by a deleted account are retained,
          marked as ended and detached from the former creator. Other riders' memberships and their own
          room-related records remain. A room may therefore continue to appear in other participants'
          history after its creator deletes their account.
        </p>
        <p>
          Information may be retained where reasonably necessary for security, service operation, dispute
          handling or legal obligations. Account deletion cannot remove information that other participants
          independently copied or that must be retained under applicable law.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-charcoal">8. Your choices and security</h2>
        <p>
          You can control browser location and notification permissions and update profile details and
          preferences available in the app. RideSync uses authentication and database access controls, but
          no internet service can guarantee absolute security. Use a strong, unique password and avoid
          sharing sensitive information in ride chat.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-charcoal">9. Children</h2>
        <p>
          RideSync is intended for people legally permitted to operate or participate in motorcycle rides.
          It is not designed for children. Do not create an account if you are not legally able to use the
          service in your location.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-charcoal">10. Changes and contact</h2>
        <p>
          This policy may be updated as RideSync changes. The final public policy must identify the service
          operator and provide a monitored privacy contact address and any legally required grievance or
          data-protection contact details. Those details have not yet been supplied in this draft and must
          be added before public launch.
        </p>
      </section>
    </LegalPageLayout>
  );
}
