/*
 * Copyright (C) 2021 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import {AlertManagerContext} from '@canvas/alerts/react/AlertManager'
import {Discussion} from '../../../graphql/Discussion'
import {DiscussionThreadContainer} from '../DiscussionThreadContainer/DiscussionThreadContainer'
import I18n from 'i18n!discussion_topics_post'
import {PER_PAGE, SearchContext} from '../../utils/constants'
import React, {useContext, useEffect, useState} from 'react'
import {ThreadPagination} from '../../components/ThreadPagination/ThreadPagination'
import {UPDATE_DISCUSSION_ENTRIES_READ_STATE} from '../../../graphql/Mutations'
import {useMutation} from 'react-apollo'
import {View} from '@instructure/ui-view'

export const DiscussionThreadsContainer = props => {
  const discussionTopic = props.discussionTopic
  const {setOnFailure, setOnSuccess} = useContext(AlertManagerContext)
  const {setPageNumber} = useContext(SearchContext)

  const [discussionEntriesToUpdate, setDiscussionEntriesToUpdate] = useState(new Set())

  const AUTO_MARK_AS_READ_DELAY = 3000

  const [updateDiscussionEntriesReadState] = useMutation(UPDATE_DISCUSSION_ENTRIES_READ_STATE, {
    onCompleted: () => {
      setOnSuccess(I18n.t('The replies were successfully updated'))
    },
    onError: () => {
      setOnFailure(I18n.t('There was an unexpected error while updating the replies'))
    }
  })

  useEffect(() => {
    if (discussionEntriesToUpdate.size > 0) {
      const interval = setInterval(() => {
        const entryIds = Array.from(discussionEntriesToUpdate)
        const entries = discussionTopic.discussionEntriesConnection.nodes.filter(entry =>
          entryIds.includes(entry._id)
        )
        entries.forEach(entry => (entry.read = true))
        setDiscussionEntriesToUpdate(new Set())
        updateDiscussionEntriesReadState({
          variables: {
            discussionEntryIds: entryIds,
            read: true
          },
          optimisticResponse: {
            updateDiscussionEntriesReadState: {
              discussionEntries: entries,
              __typename: 'UpdateDiscussionEntriesReadStatePayload'
            }
          }
        })
      }, AUTO_MARK_AS_READ_DELAY)

      return () => clearInterval(interval)
    }
  }, [
    discussionEntriesToUpdate,
    discussionTopic.discussionEntriesConnection.nodes,
    updateDiscussionEntriesReadState
  ])

  const markAsRead = entryId => {
    if (!discussionEntriesToUpdate.has(entryId)) {
      const entries = Array.from(discussionEntriesToUpdate)
      setDiscussionEntriesToUpdate(new Set([...entries, entryId]))
    }
  }

  const setPage = pageNum => {
    setPageNumber(pageNum)
  }

  return (
    <View as="div" margin="medium none none none">
      {discussionTopic.discussionEntriesConnection.nodes.map(thread => {
        return (
          <DiscussionThreadContainer
            key={`discussion-thread-${thread.id}`}
            assignment={discussionTopic?.assignment}
            discussionEntry={thread}
            discussionTopicGraphQLId={discussionTopic.id}
            markAsRead={markAsRead}
          />
        )
      })}
      {discussionTopic.entriesTotalPages > 1 && (
        <ThreadPagination
          setPage={setPage}
          selectedPage={Math.ceil(
            atob(discussionTopic.discussionEntriesConnection.pageInfo.startCursor) / PER_PAGE
          )}
          totalPages={discussionTopic.entriesTotalPages}
        />
      )}
    </View>
  )
}

DiscussionThreadsContainer.propTypes = {
  discussionTopic: Discussion.shape
}

export default DiscussionThreadsContainer
