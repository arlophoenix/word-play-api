/**
 * Copyright © 2016-present Kriasoft.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

/* @flow */
/* eslint-disable global-require */

import { nodeDefinitions, fromGlobalId } from 'graphql-relay';

import { assignType, getType } from '../utils';

export const { nodeInterface, nodeField, nodesField } = nodeDefinitions(
  (globalId, context) => {
    const { type, id } = fromGlobalId(globalId);

    switch (type) {
      case 'User':
        return context.userById.load(id).then(assignType('User'));
      case 'Email':
        return context.emailById.load(id).then(assignType('Email'));
      case 'Story':
        return context.storyById.load(id).then(assignType('Story'));
      case 'Comment':
        return context.commentById.load(id).then(assignType('Comment'));
      case 'Word':
        return context.wordById.load(id).then(assignType('Word'));
      default:
        return null;
    }
  },
  obj => {
    switch (getType(obj)) {
      case 'User':
        return require('./user/UserType').default; // TODO: <ARLO> I tried import-ing instead but it didn't work; why not?
      case 'Email':
        return require('./user/EmailType').default;
      case 'Story':
        return require('./story/StoryType').default;
      case 'Comment':
        return require('./comment/CommentType').default;
      case 'Word':
        return require('./corpus/WordType').default;
      default:
        return null;
    }
  },
);
