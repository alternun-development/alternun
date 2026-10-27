import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { localizedProjectContent, requestMarketplace } from '../../marketplace/api';
import { marketplaceCopy, marketplaceErrorMessage } from '../../marketplace/copy';
import { hasMarketplacePermission, useMarketplaceRoles } from '../../marketplace/permissions';
import {
  isProjectLocaleComplete,
  loadProjectDetail,
  projectReadiness,
  type ProjectDetailSnapshot,
} from '../../marketplace/project-detail-model';
import { ErrorPanel, LoadingPanel, SectionMessage, StatusPill } from './components';
import { ContentEditor } from './editors/content-editor';
import { ActivityEditor } from './editors/activity-editor';
import { ApprovalInbox } from './editors/approval-inbox';
import { MediaEditor } from './editors/media-editor';
import { ProjectStatusActions } from './editors/project-status-actions';
import { TeamEditor } from './editors/team-editor';
import { CommentModerationQueue } from './editors/comment-moderation-queue';
import { AirsReportEditor } from './editors/airs-report-editor';
import { ParticipantEditor } from './editors/participant-editor';
import { AuditHistory } from './editors/audit-history';
import type {
  ActivitiesProps,
  ContentTabProps,
  MediaItemsProps,
  OverviewTabProps,
  ProjectDetailTab,
  SectionStateProps,
  TeamProps,
} from './project-detail-page.types';

const tabs: ProjectDetailTab[] = [
  'overview',
  'content',
  'media',
  'activities',
  'participants',
  'airsReports',
  'comments',
  'team',
  'history',
];
const locales = ['es', 'en', 'th'] as const;

function SectionState<T>({ result, empty, onRetry, children }: SectionStateProps<T>): JSX.Element {
  if (result.kind === 'forbidden') {
    return <SectionMessage>{marketplaceCopy.errors.sectionForbidden}</SectionMessage>;
  }
  if (result.kind === 'error') {
    return (
      <div role='alert'>
        <p className='error-text'>{marketplaceErrorMessage(result.error)}</p>
        <button className='secondary-button' onClick={onRetry} type='button'>
          {marketplaceCopy.common.retry}
        </button>
      </div>
    );
  }
  return empty(result.data) ? <></> : <>{children(result.data)}</>;
}

function categoryLabel(code: string): string {
  return (
    marketplaceCopy.categories[code as keyof typeof marketplaceCopy.categories] ??
    marketplaceCopy.categories.other
  );
}

function OverviewTab({ snapshot, roles, onChanged }: OverviewTabProps): JSX.Element {
  const project = snapshot.project;
  const media = snapshot.media.kind === 'success' ? snapshot.media.data : [];
  const activities = snapshot.activities.kind === 'success' ? snapshot.activities.data : [];
  const readiness = projectReadiness(project, media, activities);
  return (
    <div className='page-grid'>
      <section className='panel'>
        <h3>{marketplaceCopy.projectDetail.overview.heading}</h3>
        <dl className='record-grid marketplace-facts'>
          <div>
            <dt>{marketplaceCopy.projectDetail.overview.enterprise}</dt>
            <dd>
              {snapshot.enterprise.kind === 'success' ? (
                <Link
                  className='inline-link'
                  to={`/marketplace/enterprises/${snapshot.enterprise.data.id}`}
                >
                  {snapshot.enterprise.data.displayName}
                </Link>
              ) : (
                marketplaceCopy.common.notAvailable
              )}
            </dd>
          </div>
          <div>
            <dt>{marketplaceCopy.enterpriseDetail.status}</dt>
            <dd>
              <StatusPill status={project.status} />
            </dd>
          </div>
          <div>
            <dt>{marketplaceCopy.projectDetail.overview.category}</dt>
            <dd>{categoryLabel(project.categoryCode)}</dd>
          </div>
          <div>
            <dt>{marketplaceCopy.projectDetail.overview.country}</dt>
            <dd>{project.countryCode ?? marketplaceCopy.common.notAvailable}</dd>
          </div>
          <div>
            <dt>{marketplaceCopy.projectDetail.overview.timeZone}</dt>
            <dd>
              {project.timeZone.trim().length > 0
                ? project.timeZone
                : marketplaceCopy.common.notAvailable}
            </dd>
          </div>
          <div>
            <dt>{marketplaceCopy.projectDetail.overview.defaultLanguage}</dt>
            <dd>
              {marketplaceCopy.languages[
                project.defaultLocale as keyof typeof marketplaceCopy.languages
              ] ?? marketplaceCopy.common.notAvailable}
            </dd>
          </div>
        </dl>
      </section>

      <section className='panel'>
        <h3>{marketplaceCopy.projectDetail.readiness.heading}</h3>
        <p>{marketplaceCopy.projectDetail.readiness.intro}</p>
        <ul className='marketplace-checklist'>
          {readiness.map((item) => (
            <li className={item.complete ? 'is-complete' : 'is-missing'} key={item.key}>
              <span aria-hidden='true'>{item.complete ? '✓' : '—'}</span>
              <span>{marketplaceCopy.projectDetail.readiness[item.key]}</span>
              <strong>
                {item.complete ? marketplaceCopy.common.fulfilled : marketplaceCopy.common.missing}
              </strong>
            </li>
          ))}
        </ul>
      </section>

      <ProjectStatusActions
        project={project}
        roles={roles}
        ready={readiness.every((item) => item.complete)}
        onChanged={onChanged}
      />
    </div>
  );
}

export function ContentTab({ project }: ContentTabProps): JSX.Element {
  const [locale, setLocale] = useState<(typeof locales)[number]>(
    locales.includes(project.defaultLocale as (typeof locales)[number])
      ? (project.defaultLocale as (typeof locales)[number])
      : 'es'
  );
  const content = project.content[locale];
  return (
    <section className='panel'>
      <h3>{marketplaceCopy.projectDetail.content.heading}</h3>
      <p>{marketplaceCopy.projectDetail.content.intro}</p>
      <div
        aria-label={marketplaceCopy.projectDetail.content.languageSelector}
        className='marketplace-language-tabs'
        role='tablist'
      >
        {locales.map((item) => {
          const complete = isProjectLocaleComplete(project, item);
          return (
            <button
              aria-selected={locale === item}
              className={locale === item ? 'is-active' : ''}
              key={item}
              onClick={() => setLocale(item)}
              role='tab'
              type='button'
            >
              <span>{marketplaceCopy.languages[item]}</span>
              <small>
                {complete ? marketplaceCopy.common.complete : marketplaceCopy.common.needsContent}
              </small>
            </button>
          );
        })}
      </div>
      {!content ? (
        <SectionMessage>{marketplaceCopy.projectDetail.content.empty}</SectionMessage>
      ) : (
        <dl className='record-grid marketplace-content-grid'>
          <div>
            <dt>{marketplaceCopy.projectDetail.content.title}</dt>
            <dd>{content.title || marketplaceCopy.common.notAvailable}</dd>
          </div>
          <div>
            <dt>{marketplaceCopy.projectDetail.content.location}</dt>
            <dd>{content.location || marketplaceCopy.common.notAvailable}</dd>
          </div>
          <div>
            <dt>{marketplaceCopy.projectDetail.content.theme}</dt>
            <dd>{content.theme || marketplaceCopy.common.notAvailable}</dd>
          </div>
          <div>
            <dt>{marketplaceCopy.projectDetail.content.description}</dt>
            <dd>{content.description || marketplaceCopy.common.notAvailable}</dd>
          </div>
          <div>
            <dt>{marketplaceCopy.projectDetail.content.waysToContribute}</dt>
            <dd>
              {content.waysToContribute?.length
                ? content.waysToContribute.join(' · ')
                : marketplaceCopy.common.notAvailable}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}

export function MediaItems({ project, media }: MediaItemsProps): JSX.Element {
  const active = media.filter((item) => item.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  if (!active.length) {
    return <SectionMessage>{marketplaceCopy.projectDetail.media.empty}</SectionMessage>;
  }
  return (
    <div className='marketplace-media-grid'>
      {active.map((item) => {
        const alt =
          item.altText[project.defaultLocale] || marketplaceCopy.projectDetail.media.imageFallback;
        const label =
          marketplaceCopy.projectDetail.media[
            item.kind === 'gallery_image' ? 'gallery' : item.kind
          ];
        if (item.kind === 'video' || item.kind === 'canva') {
          return (
            <article className='metric-card' key={item.id}>
              <h4>{label}</h4>
              <a
                className='inline-link'
                href={item.embedUrl ?? item.url}
                rel='noreferrer'
                target='_blank'
              >
                {item.kind === 'video'
                  ? marketplaceCopy.projectDetail.media.openVideo
                  : marketplaceCopy.projectDetail.media.openCanva}
              </a>
            </article>
          );
        }
        return (
          <figure className='metric-card marketplace-media-card' key={item.id}>
            <figcaption>{label}</figcaption>
            <img src={item.url} alt={alt} />
            <p>
              <strong>{marketplaceCopy.projectDetail.media.altText}:</strong> {alt}
            </p>
          </figure>
        );
      })}
    </div>
  );
}

export function Activities({ activities }: ActivitiesProps): JSX.Element {
  if (!activities.length) {
    return <SectionMessage>{marketplaceCopy.projectDetail.activities.empty}</SectionMessage>;
  }
  return (
    <div className='marketplace-card-grid'>
      {activities.map((activity) => {
        const content =
          activity.content[activity.defaultLocale] ?? Object.values(activity.content)[0];
        return (
          <article className='metric-card' key={activity.id}>
            <StatusPill status={activity.status} />
            <h4>{content?.title ?? marketplaceCopy.common.notAvailable}</h4>
            <p>{content?.description ?? marketplaceCopy.common.notAvailable}</p>
            <strong>
              {activity.defaultAirsAmount} {marketplaceCopy.projectDetail.activities.points}
            </strong>
          </article>
        );
      })}
    </div>
  );
}

export function Team({ memberships }: TeamProps): JSX.Element {
  const active = memberships.filter((membership) => membership.status === 'active');
  if (!active.length) {
    return <SectionMessage>{marketplaceCopy.projectDetail.team.empty}</SectionMessage>;
  }
  return (
    <div className='marketplace-card-grid'>
      {active.map((membership, index) => (
        <article className='metric-card' key={membership.id}>
          <h4>
            {marketplaceCopy.projectDetail.team.member} {index + 1}
          </h4>
          <p>{marketplaceCopy.projectDetail.team.roles[membership.role]}</p>
        </article>
      ))}
    </div>
  );
}

export function MarketplaceProjectDetailPage(): JSX.Element {
  const { id = '' } = useParams();
  const [tab, setTab] = useState<ProjectDetailTab>('overview');
  const [snapshot, setSnapshot] = useState<ProjectDetailSnapshot | null>(null);
  const [error, setError] = useState<unknown>();
  const [success, setSuccess] = useState<string>();
  const [pendingCommentCount, setPendingCommentCount] = useState(0);
  const roles = useMarketplaceRoles();

  const load = useCallback(() => {
    setSnapshot(null);
    setError(undefined);
    void loadProjectDetail(requestMarketplace, id).then(setSnapshot).catch(setError);
  }, [id]);

  useEffect(load, [load]);

  useEffect(() => {
    setPendingCommentCount(
      snapshot?.comments.kind === 'success' ? snapshot.comments.data.length : 0
    );
  }, [snapshot]);

  if (error) return <ErrorPanel error={error} onRetry={load} />;
  if (!snapshot || !roles) return <LoadingPanel />;

  const title =
    localizedProjectContent(snapshot.project)?.title ?? marketplaceCopy.common.notAvailable;
  const visibleTabs = tabs.filter(
    (item) =>
      (item !== 'comments' || hasMarketplacePermission(roles, 'comments:read')) &&
      (item !== 'participants' || hasMarketplacePermission(roles, 'participants:read')) &&
      (item !== 'airsReports' || hasMarketplacePermission(roles, 'airs_reports:submit')) &&
      (item !== 'history' || hasMarketplacePermission(roles, 'audit:read'))
  );
  return (
    <div className='page-grid'>
      <section className='panel hero-panel marketplace-detail-heading'>
        <div>
          <span className='panel-label'>{marketplaceCopy.projectDetail.eyebrow}</span>
          <h2>{title}</h2>
        </div>
        <StatusPill status={snapshot.project.status} />
        <Link className='inline-link' to='/marketplace'>
          {marketplaceCopy.common.backToProjects}
        </Link>
      </section>

      {success ? (
        <p className='marketplace-success' role='status'>
          {success}
        </p>
      ) : null}

      <div
        aria-label={marketplaceCopy.projectDetail.tabsLabel}
        className='marketplace-tabs'
        role='tablist'
      >
        {visibleTabs.map((item) => (
          <button
            aria-selected={tab === item}
            className={tab === item ? 'is-active' : ''}
            key={item}
            onClick={() => setTab(item)}
            role='tab'
            type='button'
          >
            {marketplaceCopy.projectDetail.tabs[item]}
            {item === 'comments' && pendingCommentCount > 0 ? (
              <span
                aria-label={`${pendingCommentCount} ${marketplaceCopy.comments.pendingCountLabel}`}
              >
                {' '}
                ({pendingCommentCount})
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div role='tabpanel'>
        {tab === 'overview' ? (
          <OverviewTab
            snapshot={snapshot}
            roles={roles}
            onChanged={(message) => {
              setSuccess(message);
              load();
            }}
          />
        ) : null}
        {tab === 'content' ? (
          <ContentEditor
            project={snapshot.project}
            roles={roles}
            onSaved={() => {
              setSuccess(marketplaceCopy.edit.success);
              load();
            }}
          />
        ) : null}
        {tab === 'media' ? (
          <SectionState result={snapshot.media} empty={() => false} onRetry={load}>
            {(media) => (
              <MediaEditor
                project={snapshot.project}
                media={media}
                roles={roles}
                onChanged={(message) => {
                  setSuccess(message);
                  load();
                }}
              />
            )}
          </SectionState>
        ) : null}
        {tab === 'activities' ? (
          <SectionState result={snapshot.activities} empty={() => false} onRetry={load}>
            {(activities) => (
              <div className='page-grid'>
                <ActivityEditor
                  project={snapshot.project}
                  activities={activities}
                  roles={roles}
                  onChanged={(message) => {
                    setSuccess(message);
                    load();
                  }}
                />
                <SectionState result={snapshot.completions} empty={() => false} onRetry={load}>
                  {(completions) => (
                    <ApprovalInbox
                      project={snapshot.project}
                      activities={activities}
                      completions={completions}
                      roles={roles}
                      onChanged={(message) => {
                        setSuccess(message);
                        load();
                      }}
                    />
                  )}
                </SectionState>
              </div>
            )}
          </SectionState>
        ) : null}
        {tab === 'team' ? (
          <SectionState result={snapshot.memberships} empty={() => false} onRetry={load}>
            {(memberships) => (
              <TeamEditor
                project={snapshot.project}
                memberships={memberships}
                roles={roles}
                onChanged={(message) => {
                  setSuccess(message);
                  load();
                }}
              />
            )}
          </SectionState>
        ) : null}
        {tab === 'participants' ? (
          <SectionState result={snapshot.participants} empty={() => false} onRetry={load}>
            {(participants) => (
              <ParticipantEditor
                project={snapshot.project}
                participants={participants}
                activities={snapshot.activities.kind === 'success' ? snapshot.activities.data : []}
                roles={roles}
                onChanged={(message) => {
                  setSuccess(message);
                  load();
                }}
              />
            )}
          </SectionState>
        ) : null}
        {tab === 'airsReports' ? (
          <AirsReportEditor project={snapshot.project} roles={roles} />
        ) : null}
        {tab === 'comments' ? (
          <CommentModerationQueue
            project={snapshot.project}
            initialPending={snapshot.comments}
            roles={roles}
            onChanged={(message, pendingDelta) => {
              setSuccess(message);
              setPendingCommentCount((current) => Math.max(0, current + pendingDelta));
            }}
          />
        ) : null}
        {tab === 'history' ? <AuditHistory project={snapshot.project} roles={roles} /> : null}
      </div>
    </div>
  );
}
