const ID_PUBLIC = "https://www.w3.org/ns/activitystreams#Public";

exports.createNote = ({
  objectUuid,
  siteURL,
  actorURL,
  config,
  actor,
  actorDeref,
  content,
  inReplyTo,
  published,
}) => {
  const { followers, url, preferredUsername } = actorDeref;

  const object = {
    type: "Note",
    id: `${siteURL}/objects/Note/${objectUuid}.json`,
    url: `${siteURL}/objects/Note/${objectUuid}.html`,
    published,
    attributedTo: actorURL,
    inReplyTo,
    to: [ID_PUBLIC],
    cc: [actor, followers],
    tag: [{ type: "Mention", href: actor }],
    content: `<p><span class="h-card"><a href="${url}" class="u-url mention">@<span>${preferredUsername}</span></a> </span>${content}</p>`,
  };

  const activity = {
    id: `${siteURL}/objects/Create/${objectUuid}.json`,
    url: `${siteURL}/objects/Create/${objectUuid}.html`,
    type: "Create",
    actor: actorURL,
    published,
    to: object.to,
    cc: object.cc,
    object,
  };

  return activity;
};
