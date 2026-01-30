package serf

import (
	"fmt"
	"log"
)

// EventType represents the type of event
type EventType string

const (
	// EventTypeJoin indicates a member joined
	EventTypeJoin EventType = "join"

	// EventTypeLeave indicates a member left gracefully
	EventTypeLeave EventType = "leave"

	// EventTypeFailed indicates a member failed
	EventTypeFailed EventType = "failed"

	// EventTypeUpdate indicates a member was updated
	EventTypeUpdate EventType = "update"
)

// Event represents a mesh event
type Event struct {
	Type   EventType
	Member *Member
}

// String returns a string representation of the event
func (e Event) String() string {
	return fmt.Sprintf("%s: %s (%s:%d)", e.Type, e.Member.Name, e.Member.Addr, e.Member.Port)
}

// EventHandler is a function that handles mesh events
type EventHandler func(Event)

// LoggingEventHandler returns an event handler that logs events
func LoggingEventHandler() EventHandler {
	return func(e Event) {
		log.Printf("[MESH] %s", e.String())
	}
}

// MemberFilter is a function that filters members
type MemberFilter func(*Member) bool

// FilterByTag returns a filter that matches members with a specific tag value
func FilterByTag(key, value string) MemberFilter {
	return func(m *Member) bool {
		if m.Tags == nil {
			return false
		}
		v, ok := m.Tags[key]
		return ok && v == value
	}
}

// FilterByStatus returns a filter that matches members with a specific status
func FilterByStatus(status string) MemberFilter {
	return func(m *Member) bool {
		return m.Status == status
	}
}

// FilterMembers filters a list of members based on the given filter
func FilterMembers(members []*Member, filter MemberFilter) []*Member {
	var filtered []*Member
	for _, m := range members {
		if filter(m) {
			filtered = append(filtered, m)
		}
	}
	return filtered
}

// GetMembersByTag returns all members with a specific tag value
func (m *Mesh) GetMembersByTag(key, value string) []*Member {
	members := m.Members()
	return FilterMembers(members, FilterByTag(key, value))
}

// GetMembersByStatus returns all members with a specific status
func (m *Mesh) GetMembersByStatus(status string) []*Member {
	members := m.Members()
	return FilterMembers(members, FilterByStatus(status))
}
