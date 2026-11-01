import LegalPageLayout from '@/components/LegalPageLayout';

export default function TermsPage() {
  return (
    <LegalPageLayout title="Terms of Service" updatedAt="2 November 2026">
      <section>
        <h2 className="text-base font-bold text-charcoal">1. Agreement and eligibility</h2>
        <p>
          These draft terms describe the rules for using RideSync. By creating an account or using the
          service, you agree to follow the final terms once they are published. RideSync is intended for
          people legally permitted to participate in motorcycle rides. You are responsible for complying
          with age, licensing and other legal requirements that apply to you.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-charcoal">2. What RideSync does</h2>
        <p>
          RideSync provides tools for motorcycle groups, including ride rooms, shared GPS locations,
          destination and route displays, group chat, ride timing, ride history and SOS alerts. Features may
          change, become unavailable or depend on your device, browser, GPS, network and third-party services.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-charcoal">3. Ride safely — your responsibility</h2>
        <p>
          RideSync is a coordination aid only. It is not a navigation authority, traffic service, road-safety
          system, emergency dispatcher or substitute for your own judgement. GPS positions, speed readings,
          maps, routes and estimated travel information can be delayed, inaccurate or unavailable.
        </p>
        <p>
          Never operate or interact with a phone while riding. Set up the app before departure, stop in a
          safe and lawful place before using it, obey traffic laws and road signs, wear appropriate protective
          equipment, and make your own decisions about road, weather and riding conditions. You remain
          responsible for your vehicle, conduct, route and safety.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-charcoal">4. SOS and emergency limitations</h2>
        <p>
          SOS is a group alert feature, not an emergency service. It does not contact police, ambulance,
          roadside assistance or other public emergency responders. Push notifications may be delayed,
          blocked or never delivered because of device settings, connectivity, browser support or service
          outages. Do not rely on RideSync as your only way to request help. In an emergency, contact the
          appropriate local emergency service directly.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-charcoal">5. Accounts and acceptable use</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Provide accurate account and rider information and keep your sign-in credentials secure.</li>
          <li>Use ride rooms only with people you intend to coordinate with.</li>
          <li>Do not impersonate another rider or share another person's location without a legitimate ride-related reason and appropriate permission.</li>
          <li>Do not harass, threaten, spam, track, exploit or endanger other users.</li>
          <li>Do not attempt to bypass access controls, disrupt the service or access data that does not belong to you.</li>
          <li>Do not use RideSync to break laws or encourage unsafe riding.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-bold text-charcoal">6. User content and group information</h2>
        <p>
          You are responsible for the messages, display names and other information you submit. Content and
          live ride information may be visible to other members of the relevant ride room. Do not post
          passwords, financial information or other sensitive personal information in group chat.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-charcoal">7. Availability and third-party services</h2>
        <p>
          RideSync may rely on hosting, authentication, database, mapping, routing, browser and push
          notification providers. Their availability and terms may affect the app. The service is provided
          on an evolving basis and may be changed, interrupted or discontinued. We will not promise
          uninterrupted or error-free operation.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-charcoal">8. Suspension, termination and account deletion</h2>
        <p>
          Access may be restricted or suspended where reasonably necessary to protect users, investigate
          misuse, maintain security or comply with law. You may stop using RideSync at any time and
          permanently delete your account from Settings. Account deletion removes your account and
          account-linked personal records as described in the Privacy Policy.
        </p>
        <p>
          Ride rooms you created are retained for the other participants, marked as ended and detached from
          your account. Other riders' memberships and their own room-related records remain. Account deletion
          is permanent and cannot be undone.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-charcoal">9. Disclaimers and liability</h2>
        <p>
          To the extent permitted by applicable law, RideSync is provided without guarantees that GPS,
          maps, routes, ride data, chat or notifications will always be accurate, available or timely.
          Nothing in these draft terms excludes rights or liability that cannot legally be excluded. The
          operator, limitation wording and any legally required consumer protections must be reviewed by
          qualified counsel before these terms are finalised.
        </p>
      </section>

      <section>
        <h2 className="text-base font-bold text-charcoal">10. Governing law and contact</h2>
        <p>
          The governing law, dispute-resolution process, legal operator name and official contact details
          must be completed after legal review and before public launch. These details are intentionally
          not guessed in this draft.
        </p>
      </section>
    </LegalPageLayout>
  );
}
