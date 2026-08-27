import { Icon, type IconName } from "@/components/icon";

export type FeatureStory = { icon: IconName; label: string; title: string; body: string };

export type FeatureShowcaseUi = {
  amount: string;
  deliveryAction: string;
  deliveryPopup: string;
  problemLabel: string;
  evidenceFlowLabel: string;
  supportPill: string;
  rail: string[];
};

export function FeatureShowcase({ kicker, heading, lead, features, ui }: {
  kicker: string;
  heading: string;
  lead: string;
  features: FeatureStory[];
  ui: FeatureShowcaseUi;
}) {
  return (
    <section className="sd-inside" aria-labelledby="sd-inside-title">
      <div className="sd-inside__atmosphere" aria-hidden />
      <div className="sd-inside__sticky">
        <div className="sd-wrap sd-inside__layout">
          <div className="sd-inside__story">
            <span className="sd-inside__kicker">{kicker}</span>
            <h2 id="sd-inside-title">{heading}</h2>
            <p className="sd-inside__lead">{lead}</p>
          </div>

          <div className="sd-inside__board">
            {features.map((feature, index) => (
              <div className="sd-inside__tile" data-index={index} key={feature.label}>
                <div className="sd-inside__tile-preview" aria-hidden><ProductPreview index={index} ui={ui} /></div>
                <div className="sd-inside__tile-copy">
                  <span className="sd-feature-card__chip"><Icon name={feature.icon} />{feature.label}</span>
                  <h3>{feature.title}</h3>
                </div>
              </div>
            ))}
          </div>

          <div className="sd-inside__mobile-list">
            {features.map((feature, index) => (
              <article className="sd-inside__mobile-item" key={feature.title}>
                <div className="sd-inside__mobile-copy">
                  <span className="sd-feature-card__chip"><Icon name={feature.icon} />{feature.label}</span>
                  <h3>{feature.title}</h3>
                </div>
                <div className="sd-inside__mobile-preview" aria-hidden><ProductPreview index={index} ui={ui} /></div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductPreview({ index, ui }: { index: number; ui: FeatureShowcaseUi }) {
  if (index === 1) return <ActionPreview ui={ui} />;
  if (index === 2) return <HistoryPreview ui={ui} />;
  if (index === 3) return <SupportPreview ui={ui} />;
  return <FundsPreview ui={ui} />;
}

function FundsPreview({ ui }: { ui: FeatureShowcaseUi }) {
  return <div className="sd-feature-viz sd-feature-viz--funds">
    <div className="sd-shield-scene__backdrop"><i /><i /><i /></div>
    <div className="sd-shield-scene__focus"><span><Icon name="protection" /></span><strong>{ui.amount}</strong></div>
  </div>;
}

function ActionPreview({ ui }: { ui: FeatureShowcaseUi }) {
  return <div className="sd-feature-viz sd-feature-viz--action">
    <div className="sd-action-scene__button"><Icon name="shipment" />{ui.deliveryAction}</div>
    <span className="sd-action-scene__cursor"><Icon name="pointer" /></span>
    <div className="sd-action-scene__popup"><span><Icon name="shipment" /></span><strong>{ui.deliveryPopup}</strong><Icon name="verified" /></div>
  </div>;
}

function HistoryPreview({ ui }: { ui: FeatureShowcaseUi }) {
  const icons: IconName[] = ["check", "payment", "protection", "shipment", "complete"];
  return <div className="sd-feature-viz sd-feature-viz--history">
    <div className="sd-steps-scene__line"><i /></div>
    <div className="sd-steps-scene__steps">{ui.rail.map((label, index) => <div className="sd-steps-scene__step" key={label}>
      <span><Icon name={icons[index] ?? "check"} /></span><small>{label}</small>
    </div>)}</div>
  </div>;
}

function SupportPreview({ ui }: { ui: FeatureShowcaseUi }) {
  return <div className="sd-feature-viz sd-feature-viz--support">
    <svg className="sd-support-flow__lines" viewBox="0 0 420 210" preserveAspectRatio="none" aria-hidden>
      <path d="M112 48 H210 Q236 48 236 74 V96" />
      <path d="M236 118 V134 Q236 158 262 158 H320" />
    </svg>
    <div className="sd-support-flow__pill sd-support-flow__pill--problem"><Icon name="warning" />{ui.problemLabel}</div>
    <div className="sd-support-flow__pill sd-support-flow__pill--evidence"><Icon name="audit" />{ui.evidenceFlowLabel}</div>
    <div className="sd-support-flow__pill sd-support-flow__pill--human"><Icon name="support" />{ui.supportPill}<Icon name="verified" /></div>
  </div>;
}
